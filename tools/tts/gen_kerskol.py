#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generation des clips voix Kerskol (a lancer sur le PC Windows, GPU).

Reutilise la chaine EPROUVEE de C:\\Audiobooks\\pipeline (core.py + voix.py) :
meme recette Qwen3-TTS Base, empreinte ref_naf_D calculee une fois, seed 1234,
cap_tokens anti-emballement, crete < -40 dB => MUET, regen multi-graines. Ajoute
la couche Kerskol : catalogue par cles logiques, identite par hash du texte
nettoye, encodage web MP3 et manifest JSON.

Sortie :
  <out>/<voice>/<clip_id>.wav   (intermediaire PCM16 24k mono)
  <out>/<voice>/<clip_id>.mp3   (livrable web : loudnorm -18 LUFS/-1.5 dBTP, 64k mono 24k)
  <out>/manifest.json           (voice, format, clips{id:{text,ms,cat}}, keys{key:id})
  <out>/journal.json            (progression/reprise, controles)

Controles par bloc (recette + adaptation Manu) :
  - MUET    : crete < -40 dB
  - EMBALLE : duree >= 95% du plafond cap/12
  - SUSPECT : duree hors [0.5 ; 1.7] x (caracteres/20.3) s
              -> pour les textes TRES COURTS (< 15 caracteres : un nombre,
                 « Bravo »), la duree attendue est peu fiable : on ELARGIT le
                 seuil a [0.3 ; 3.0] x et on borne en absolu [0.25 s ; 6 s].
  Regen graines 1234 -> 4321 -> 2025 -> 777 -> 9999, on garde la 1re qui passe ;
  backup horodate du wav AVANT tout ecrasement.

Usage (PC Windows, venv C:\\Audiobooks\\venv) :
  python gen_kerskol.py --out C:\\kerskol-tts\\sortie [--pilot] [--only KEY,KEY]
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
# modules Kerskol (a cote de ce script)
sys.path.insert(0, str(HERE))
# chaine audiobook eprouvee
sys.path.insert(0, r"C:\Audiobooks")
sys.path.insert(0, r"C:\Audiobooks\pipeline")

from catalogue import construire                     # noqa: E402
from nettoyage import VOICE_VERSION, clip_id, nettoyer  # noqa: E402

SEUIL_COURT = 15          # caracteres : en-deca, duree peu fiable
SEEDS = [1234, 4321, 2025, 777, 9999]
BITRATE = "64k"


def _log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def _bornes_suspect(n_signes: int, att: float) -> tuple[float, float]:
    """Intervalle de duree acceptable (s).

    Textes TRES COURTS (< 15 car : un nombre, « Bravo ») : la duree attendue
    (caracteres/20,3) est peu fiable (un mot isole dure 0,4 a 1,2 s sans rapport
    lineaire avec sa longueur). On n'utilise donc que des bornes ABSOLUES larges
    [0,25 s ; 6 s] : les cas reels (muet, emballement) restent captures par les
    controles MUET (< -40 dB) et EMBALLE (>= 95% du plafond), et on evite des
    regenerations inutiles. Au-dela de 15 car, regle nominale [0,5 ; 1,7] x att."""
    if n_signes < SEUIL_COURT:
        return (0.25, 6.0)
    return (0.5 * att, 1.7 * att)


def _encoder_mp3(wav: Path, mp3: Path, core) -> None:
    """WAV -> MP3 web : loudnorm EBU R128 (-18 LUFS / -1.5 dBTP), mono 24k, 64k."""
    tmp = mp3.parent / f".{mp3.stem}.partiel.mp3"
    cmd = [core.ffmpeg_bin(), "-y", "-hide_banner", "-loglevel", "error",
           "-i", str(wav), "-af", core.loudnorm_filter(),
           "-ac", "1", "-ar", str(core.SR), "-c:a", "libmp3lame",
           "-b:a", BITRATE, str(tmp)]
    rc, _, err = core.run_cap(cmd)
    if rc != 0:
        raise RuntimeError(f"ffmpeg mp3 rc={rc} : {err[:200]}")
    os.replace(tmp, mp3)


def generer(out_dir: Path, pilot: bool, only: set[str] | None, force: bool = False) -> dict:
    import core
    from voix import VoixEngine

    voice = VOICE_VERSION
    vdir = out_dir / voice
    vdir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"
    journal_path = out_dir / "journal.json"

    manifest = {"voice": voice, "format": "mp3", "sample_rate": core.SR,
                "bitrate": BITRATE, "clips": {}, "keys": {}}
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest.setdefault("clips", {}); manifest.setdefault("keys", {})
        except Exception:
            pass

    clips = construire(pilot=pilot)
    if only:
        clips = [c for c in clips if c["key"] in only]
    _log(f"catalogue : {len(clips)} cles ({'pilote' if pilot else 'complet'})")

    engine = VoixEngine()        # charge modele + empreinte a la 1re generation
    journal = {"maj": None, "faits": 0, "total": len(clips),
               "muets": [], "emballes": [], "suspects": [], "echecs": []}
    t0 = time.time()
    gen_total = 0.0
    n_gen = 0

    for idx, c in enumerate(clips, 1):
        key, cat = c["key"], c["cat"]
        texte = nettoyer(c["text"])
        cid = clip_id(texte, voice)
        manifest["keys"][key] = cid
        mp3 = vdir / f"{cid}.mp3"
        wav = vdir / f"{cid}.wav"

        # reprise : clip deja encode (sauf regeneration forcee)
        if not force and mp3.exists() and mp3.stat().st_size > 400 and cid in manifest["clips"]:
            continue

        att = len(texte) / core.SIG_PER_SEC
        lo, hi = _bornes_suspect(len(texte), att)

        meilleur = None
        for sd in SEEDS:
            t = time.time()
            w, sr, cap, d, pk, muet, emballe = engine.generer_bloc(texte, seed=sd)
            gen_total += time.time() - t; n_gen += 1
            suspect = not (lo <= d <= hi)
            ok = (not muet) and (not emballe) and (not suspect)
            if meilleur is None or ok:
                meilleur = (sd, w, sr, cap, d, pk, muet, emballe, suspect)
            if ok:
                break

        sd, w, sr, cap, d, pk, muet, emballe, suspect = meilleur
        # backup avant ecrasement eventuel
        if wav.exists():
            bdir = out_dir / "_backup" / datetime.now().strftime("%Y%m%d-%H%M")
            bdir.mkdir(parents=True, exist_ok=True)
            (bdir / wav.name).write_bytes(wav.read_bytes())

        # ecriture atomique du wav puis encodage mp3
        import soundfile as sf
        tmp = vdir / f".{cid}.partiel.wav"
        sf.write(str(tmp), w, sr, format="WAV", subtype="PCM_16")
        os.replace(tmp, wav)
        _encoder_mp3(wav, mp3, core)
        ms = int(round(d * 1000))

        manifest["clips"][cid] = {"text": texte, "ms": ms, "cat": cat}
        if muet:    journal["muets"].append({"key": key, "cid": cid, "crete_db": round(pk, 1)})
        if emballe: journal["emballes"].append({"key": key, "cid": cid, "duree_s": round(d, 2), "cap": cap})
        if suspect: journal["suspects"].append({"key": key, "cid": cid, "duree_s": round(d, 2),
                                                 "bornes": [round(lo, 2), round(hi, 2)], "n": len(texte)})
        journal["faits"] += 1
        journal["maj"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        _log(f"{idx:4d}/{len(clips)} {cat:9s} {key:18s} {d:4.1f}s seed={sd} "
             f"crete {pk:5.1f}dB{'  MUET' if muet else ''}"
             f"{'  EMBALLE' if emballe else ''}{'  SUSPECT' if suspect else ''}")

        # persistance incrementale (reprise)
        _ecrire_atomic(manifest_path, manifest)
        _ecrire_atomic(journal_path, journal)

    dt = time.time() - t0
    rtf = (gen_total / n_gen) if n_gen else 0.0
    journal["duree_totale_s"] = round(dt, 1)
    journal["gen_moyenne_par_essai_s"] = round(rtf, 2)
    _ecrire_atomic(journal_path, journal)
    _log(f"TERMINE : {journal['faits']} clips en {dt/60:.1f} min, "
         f"{len(journal['muets'])} muets, {len(journal['emballes'])} emballes, "
         f"{len(journal['suspects'])} suspects, {len(journal['echecs'])} echecs ; "
         f"~{rtf:.1f}s/essai")
    return journal


def _ecrire_atomic(path: Path, obj) -> None:
    tmp = path.with_suffix(path.suffix + ".partiel")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--only", default=None, help="cles separees par des virgules")
    ap.add_argument("--force", action="store_true",
                    help="regenere meme si deja present (regen pilotee par relecture)")
    a = ap.parse_args(argv)
    only = set(x.strip() for x in a.only.split(",") if x.strip()) if a.only else None
    generer(Path(a.out), a.pilot, only, force=a.force)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
