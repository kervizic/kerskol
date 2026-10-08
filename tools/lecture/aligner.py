#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aligneur « lecture rythmee » (hors ligne, CPU, outils LIBRES).

Chaine, par texte de la Bibliotheque disposant d'un enregistrement LibriVox :
  1. recupere l'audio de NOTRE extrait (clip deja rogne, voir --sources / trims) ;
  2. encode un WAV mono 16 kHz pour l'alignement ;
  3. ALIGNE mot a mot avec aeneas (forced alignment, licence GNU AGPL/LGPL,
     synthese espeak-ng + DTW ; aucun modele a telecharger, 100% CPU) ;
  4. controle qualite (couverture 100% des mots, durees plausibles, pas de
     chevauchement, index croissant) ; REJETTE le texte si douteux ;
  5. encode l'audio de diffusion : Opus/OGG mono ~32 kb/s + repli AAC/M4A iOS ;
  6. ecrit public/voix/lecture/<id>.{opus,m4a,json} et met a jour manifest.json.

La tokenisation vient de tokenize_fr.py (MIROIR du front) : le QC compare mot a
mot avec le texte affiche, donc toute derive fait rejeter le texte.

REPRODUCTIBLE : memes entrees (extraits.json + clips sources) -> memes sorties.
Servira a l'identique pour la future VOIX DE MANU : il suffira de deposer ses
clips (meme nommage) et de relancer ce script ; le format JSON ne change pas.

Usage (dans le conteneur Docker, voir Dockerfile) :
    python3 aligner.py --id c2-011
    python3 aligner.py --all
Options :
    --sources DIR   dossier des clips deja rognes <id>.(mp3|m4a|opus|wav|ogg)
    --out DIR       dossier de sortie (defaut: ../../frontend/public/voix/lecture)
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile

from tokenize_fr import mots_du_corps

ICI = os.path.dirname(os.path.abspath(__file__))
EXTRAITS = os.path.join(ICI, "extraits.json")
DEFAUT_SOURCES = os.path.join(ICI, "sources")
DEFAUT_OUT = os.path.normpath(
    os.path.join(ICI, "..", "..", "frontend", "public", "voix", "lecture")
)
EXT_SOURCE = ("wav", "ogg", "opus", "m4a", "mp3", "flac")

DUREE_MIN_MS = 40
DUREE_MAX_MS = 4000
TOLERANCE_CHEVAUCHEMENT_MS = 20


def sh(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def charger_extraits():
    return json.load(open(EXTRAITS, encoding="utf-8"))


def trouver_source(sources_dir, tid):
    for ext in EXT_SOURCE:
        p = os.path.join(sources_dir, f"{tid}.{ext}")
        if os.path.exists(p):
            return p
    return None


def vers_wav(src, wav):
    # mono 16 kHz : entree attendue par aeneas/espeak
    sh(["ffmpeg", "-y", "-i", src, "-ac", "1", "-ar", "16000", wav])


def ecrire_mots(mots, chemin):
    with open(chemin, "w", encoding="utf-8") as f:
        f.write("\n".join(mots) + "\n")


def run_aeneas(wav, mots_txt, sortie_json):
    # Detection automatique de la tete (annonce « ... LibriVox / titre ») et de
    # la queue (outro) non couvertes par notre texte : aeneas les ignore. Evite
    # d'avoir a renseigner des offsets manuels par texte.
    conf = (
        "task_language=fra|is_text_type=plain|os_task_file_format=json"
        "|is_audio_file_detect_head_max=12.000|is_audio_file_detect_tail_max=18.000"
    )
    sh([sys.executable, "-m", "aeneas.tools.execute_task", wav, mots_txt, conf, sortie_json])


def lisser(timings):
    """Plancher de duree (40 ms) + monotonie stricte (pas de chevauchement).

    aeneas colle parfois deux mots (duree 0) ou produit une micro-duree. On
    etend alors la fin a debut+40 ms et on repousse le debut du mot suivant si
    besoin. Ajustements de quelques ms, bornes dans le texte : la lecture par
    GROUPE (bornes = min debut / max fin du groupe) n'en souffre pas.
    """
    MIN = 40
    for i, t in enumerate(timings):
        if t["fin_ms"] < t["debut_ms"]:
            t["fin_ms"] = t["debut_ms"]
        if t["fin_ms"] - t["debut_ms"] < MIN:
            t["fin_ms"] = t["debut_ms"] + MIN
        if i + 1 < len(timings) and timings[i + 1]["debut_ms"] < t["fin_ms"]:
            timings[i + 1]["debut_ms"] = t["fin_ms"]
    return timings


def parse_aeneas(sortie_json, mots):
    data = json.load(open(sortie_json, encoding="utf-8"))
    frags = data.get("fragments", [])
    timings = []
    i = 0
    for fr in frags:
        lignes = fr.get("lines", [])
        texte = (lignes[0] if lignes else "").strip()
        if not texte:
            continue  # fragment vide (tete/queue) ignore
        debut = int(round(float(fr["begin"]) * 1000))
        fin = int(round(float(fr["end"]) * 1000))
        timings.append({"mot": texte, "debut_ms": debut, "fin_ms": fin, "index": i})
        i += 1
    return timings


def normaliser(m):
    return re.sub(r"^['’]+|['’]+$", "", m.lower())


def controle_qualite(timings, mots):
    problemes = []
    if len(timings) != len(mots):
        problemes.append(f"couverture: {len(timings)} timings / {len(mots)} mots")
    n = min(len(timings), len(mots))
    for i in range(n):
        t = timings[i]
        if t["index"] != i:
            problemes.append(f"index {i}: {t['index']}")
        if normaliser(t["mot"]) != normaliser(mots[i]):
            problemes.append(f"mot {i}: « {t['mot']} » != « {mots[i]} »")
        duree = t["fin_ms"] - t["debut_ms"]
        if not (t["debut_ms"] >= 0 and t["fin_ms"] > t["debut_ms"]):
            problemes.append(f"duree {i}: {t['debut_ms']}->{t['fin_ms']}")
        elif duree < DUREE_MIN_MS or duree > DUREE_MAX_MS:
            problemes.append(f"duree implausible {i}: {duree} ms")
        if i > 0 and t["debut_ms"] + TOLERANCE_CHEVAUCHEMENT_MS < timings[i - 1]["fin_ms"]:
            problemes.append(f"chevauchement {i}")
    return problemes


def encoder_diffusion(src, out_dir, tid, debut_s, duree_s):
    opus = os.path.join(out_dir, f"{tid}.opus")
    m4a = os.path.join(out_dir, f"{tid}.m4a")
    # On n'encode QUE notre passage [debut_s, debut_s+duree_s] : l'annonce
    # LibriVox / le titre en tete et l'outro en queue sont coupes. -ss/-t APRES
    # -i (seek precis car on reencode).
    base = ["ffmpeg", "-y", "-i", src, "-ss", f"{debut_s:.3f}", "-t", f"{duree_s:.3f}", "-ac", "1"]
    # Opus/OGG mono ~32 kb/s (parole, tres compact)
    sh(base + ["-c:a", "libopus", "-b:a", "32k", "-application", "voip", opus])
    # Repli AAC/M4A pour Safari iOS (Opus non lu dans <audio>)
    sh(base + ["-c:a", "aac", "-b:a", "48k", m4a])
    return opus, m4a


def duree_ms(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
    ])
    return int(round(float(out.strip()) * 1000))


def maj_manifest(out_dir, tid, ajouter=True):
    chemin = os.path.join(out_dir, "manifest.json")
    man = {"textes": []}
    if os.path.exists(chemin):
        try:
            man = json.load(open(chemin, encoding="utf-8"))
        except Exception:
            man = {"textes": []}
    textes = set(man.get("textes", []))
    if ajouter:
        textes.add(tid)
    else:
        textes.discard(tid)
    man["textes"] = sorted(textes)
    man["_doc"] = (
        "Textes de la Bibliotheque disposant d'un audio + timings valides (QC "
        "passe). Genere par tools/lecture/aligner.py. Le bouton Ecouter "
        "n'apparait que pour ces ids."
    )
    json.dump(man, open(chemin, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def traiter(extrait, sources_dir, out_dir):
    tid = extrait["id"]
    mots = mots_du_corps(extrait["corps"])
    src = trouver_source(sources_dir, tid)
    if not src:
        print(f"[{tid}] IGNORE : aucun clip source dans {sources_dir}")
        return False
    os.makedirs(out_dir, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "a.wav")
        mots_txt = os.path.join(tmp, "mots.txt")
        aj = os.path.join(tmp, "align.json")
        vers_wav(src, wav)
        ecrire_mots(mots, mots_txt)
        run_aeneas(wav, mots_txt, aj)
        timings = lisser(parse_aeneas(aj, mots))
        problemes = controle_qualite(timings, mots)
        if problemes:
            print(f"[{tid}] REJETE ({len(problemes)} pb) :")
            for p in problemes[:12]:
                print("   -", p)
            return False
        # Decoupe serree : on garde [1er mot - PAD, dernier mot + PAD] et on
        # rebase les timings a 0 (titre/outro coupes, fichiers plus petits).
        PAD = 150
        debut_ms = max(0, timings[0]["debut_ms"] - PAD)
        fin_ms = timings[-1]["fin_ms"] + PAD
        for t in timings:
            t["debut_ms"] -= debut_ms
            t["fin_ms"] -= debut_ms
        opus, m4a = encoder_diffusion(
            src, out_dir, tid, debut_ms / 1000.0, (fin_ms - debut_ms) / 1000.0
        )
        meta = {
            "id": tid,
            "outil": "aeneas (forced alignment, espeak-ng, CPU)",
            "audio": {
                "opus": os.path.basename(opus),
                "m4a": os.path.basename(m4a),
                "duree_ms": duree_ms(opus),
            },
            "mots": timings,
        }
        json.dump(
            meta,
            open(os.path.join(out_dir, f"{tid}.json"), "w", encoding="utf-8"),
            ensure_ascii=False,
            indent=2,
        )
        maj_manifest(out_dir, tid, ajouter=True)
        print(f"[{tid}] OK : {len(timings)} mots, {meta['audio']['duree_ms']} ms")
        return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", help="id d'un texte (ex. c2-011)")
    ap.add_argument("--all", action="store_true", help="traiter tous les extraits")
    ap.add_argument("--sources", default=DEFAUT_SOURCES)
    ap.add_argument("--out", default=DEFAUT_OUT)
    args = ap.parse_args()

    extraits = charger_extraits()
    if args.id:
        extraits = [e for e in extraits if e["id"] == args.id]
        if not extraits:
            print("id inconnu", file=sys.stderr)
            sys.exit(2)
    elif not args.all:
        ap.error("preciser --id <id> ou --all")

    ok = 0
    for e in extraits:
        if traiter(e, args.sources, args.out):
            ok += 1
    print(f"\nTermine : {ok}/{len(extraits)} texte(s) alignes.")


if __name__ == "__main__":
    main()
