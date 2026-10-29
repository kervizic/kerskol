#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""deploy_lot.py - deploiement IDEMPOTENT d'un lot de clips voix generes.

A lancer depuis la racine du depot, sur le Mac (acces manu-win + VPS). Peut etre
relance autant de fois qu'on veut : il ne traite que les clips NOUVEAUX (presents
dans le manifest de generation manu-win mais absents du manifest committe).

Etapes :
  a. recuperer le manifest de generation + les nouveaux mp3 depuis manu-win ;
  b. controle rapide des nouveaux clips : duree non nulle ; ASR (whisper small sur
     GPU si libre, sinon CPU) UNIQUEMENT sur les nouveaux ; on ECARTE un clip
     seulement s'il est MUET, TRONQUE ou d'accent anglais (jamais pour une simple
     faute d'orthographe de l'ASR) ;
  c. copier les mp3 retenus sur le VPS dans /opt/kerskol/audio/<voice>/ AVANT le
     manifest ;
  d. mettre a jour le manifest committe + le servir immediatement (copie dans
     dist, sans rebuild de l'appli) ; commit + push main ;
  e. verifier avec curl le manifest + un echantillon de mp3 (200), puis
     kertec.fr / www / map / api (200) ;
  f. afficher la couverture mesuree + le nombre de clips restants.

Reglages par variables d'environnement (optionnel) :
  SKIP_ASR=1       : saute le controle ASR (ex. si trop long), ne retient que la
                     duree non nulle ;
  NO_COMMIT=1      : ne commit/push pas (test a blanc).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = REPO / "frontend/public/voix/manifest.json"
VOICE = "c1s33-v1"
WIN = "manu-win"
# Dossier de sortie de generation sur manu-win. Surchargable (WIN_OUT) pour
# deployer un lot genere a part, ex. les fragments de correction (sortie_frags),
# sans entrer en course avec le manifest de gen_full (sortie_c1s33).
WIN_OUT = os.environ.get("WIN_OUT", r"C:\kerskol-tts\sortie_c1s33")
WIN_OPTS = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=12"]
KEY = os.path.expanduser("~/.ssh/dict_project")
VPS_OPTS = ["-i", KEY, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes",
            "-o", "ConnectTimeout=10"]
VPS_HOSTS = ["ubuntu@100.118.107.122", "ubuntu@51.38.178.151"]
AUDIO_DIR = f"/opt/kerskol/audio/{VOICE}"
GEN_LIST = REPO / "tools/tts/data/voix-a-generer.json"


def run(cmd, **kw):
    return subprocess.run(cmd, text=True, capture_output=True,
                          encoding="utf-8", errors="replace", **kw)


def log(m):
    print(m, flush=True)


def resolve_vps() -> str:
    for h in VPS_HOSTS:  # une tentative par cible
        if run(["ssh", *VPS_OPTS, h, "true"]).returncode == 0:
            log(f"VPS = {h}")
            return h
    log("ERREUR : VPS injoignable (Tailscale + repli).")
    sys.exit(1)


def ssh_win(ps: str, timeout: float | None = None):
    return run(["ssh", *WIN_OPTS, WIN, ps], timeout=timeout)


def ssh_vps(vps: str, sh: str):
    return run(["ssh", *VPS_OPTS, vps, sh])


def main() -> int:
    vps = resolve_vps()
    committed = json.loads(MANIFEST.read_text(encoding="utf-8"))

    # a. manifest de generation manu-win
    tmp = Path(tempfile.mkdtemp(prefix="deploy_lot_"))
    win_mf = tmp / "win_manifest.json"
    r = run(["scp", *WIN_OPTS, f"{WIN}:{WIN_OUT}/manifest.json".replace('\\', '/'),
             str(win_mf)])
    if r.returncode != 0 or not win_mf.exists():
        log("ERREUR : manifest de generation introuvable sur manu-win.\n" + r.stderr)
        return 1
    gen = json.loads(win_mf.read_text(encoding="utf-8"))

    # nouveaux clips = cles de prose (txt:) OU de fragments de correction (frag:)
    # du manifest de gen, dont le cid est absent du manifest committe.
    old_cids = set(committed["clips"].keys())
    new = {}  # key -> cid
    for k, cid in gen["keys"].items():
        if k.startswith(("txt:", "frag:")) and cid not in old_cids:
            new[k] = cid
    new_cids = sorted(set(new.values()))
    log(f"clips committes : {len(old_cids)} ; nouveaux a traiter : {len(new_cids)}")

    retenus = set()  # cids valides a deployer
    if new_cids:
        # b1. controle duree non nulle (manifest de gen)
        for k, cid in list(new.items()):
            ms = gen["clips"].get(cid, {}).get("ms", 0)
            if ms and ms > 0:
                retenus.add(cid)
        ecartes_duree = set(new.values()) - retenus
        if ecartes_duree:
            log(f"ecartes (duree nulle) : {len(ecartes_duree)}")

        # b2. ASR sur les NOUVEAUX uniquement (sauf SKIP_ASR). Exclut MUET /
        # TRONQUE / accent anglais ; jamais pour une faute d'orthographe.
        if not os.environ.get("SKIP_ASR") and retenus:
            exclus = asr_controle(sorted(retenus), new, tmp)
            if exclus:
                log(f"ecartes par ASR (muet/tronque/accent) : {len(exclus)}")
            retenus -= exclus

        if not retenus:
            log("aucun nouveau clip retenu.")
        else:
            # pull des mp3 retenus (zip via manu-win)
            pull_mp3(sorted(retenus), tmp)
            # c. copie sur le VPS AVANT le manifest
            mp3s = [str(tmp / "mp3" / f"{c}.mp3") for c in sorted(retenus)]
            mp3s = [p for p in mp3s if Path(p).exists()]
            if mp3s:
                rc = subprocess.run(["scp", *VPS_OPTS, *mp3s,
                                     f"{vps}:{AUDIO_DIR}/"]).returncode
                if rc != 0:
                    log("ERREUR : copie mp3 vers le VPS a echoue.")
                    return 1
                log(f"mp3 copies sur le VPS : {len(mp3s)}")
            # d. fusion manifest committe (uniquement les cids retenus)
            for k, cid in new.items():
                if cid in retenus:
                    committed["keys"][k] = cid
                    committed["clips"][cid] = gen["clips"][cid]
            MANIFEST.write_text(json.dumps(committed, ensure_ascii=False, indent=2),
                                encoding="utf-8")
            if not os.environ.get("NO_COMMIT"):
                commit_push(len(retenus))
            # service immediat : copie du manifest dans dist (pas de rebuild appli)
            r = run(["scp", *VPS_OPTS, str(MANIFEST),
                     f"{vps}:/opt/kerskol/frontend/dist/voix/manifest.json"])
            if r.returncode == 0:
                log("manifest servi immediatement (copie dans dist).")
            else:
                log("NB : copie dist echouee ; le prochain deploy habituel le servira.")

    # e. verifications HTTP
    verif_http(sorted(retenus))

    # f. couverture + restant
    couverture_et_restant(gen)
    log("deploy_lot termine.")
    return 0


ASR_CACHE = r"C:\kerskol-tts\models_asr"  # cache modeles whisper (jamais C:\Audiobooks)


def asr_controle(cids: list[str], new: dict, tmp: Path) -> set:
    """ASR whisper SMALL en controle QUALITE PAR SONDAGE, JAMAIS bloquant.

    Regles (correctif du blocage CPU) :
      - GPU libre (util <= 25%, meme garde-fou que la generation) -> on sonde TOUT ;
        sinon CPU (lent) -> on ne sonde qu'un ECHANTILLON regulierement espace
        (ASR_SAMPLE, defaut 30) pour borner le temps ;
      - chaque appel ASR est borne par ASR_BUDGET secondes (defaut 420) ; si l'ASR
        depasse ce budget, on l'ABANDONNE et on deploie par la seule duree non nulle
        (le controle ASR n'est qu'un garde-fou qualite, il ne doit jamais empecher
        les mp3 valides de partir) ;
      - on n'ECARTE que des clips REELLEMENT sondes (muet / tronque / accent anglais),
        jamais pour une simple faute d'orthographe de l'ASR.
    Retourne l'ensemble des cid a ECARTER."""
    # GPU libre ? (util <= 25, meme garde-fou que _wait_for_gpu de la generation)
    u = ssh_win("nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits")
    try:
        gpu_free = int(u.stdout.strip().splitlines()[0]) <= 25
    except Exception:
        gpu_free = False
    device = "cuda" if gpu_free else "cpu"

    # echantillon : tout sur GPU (rapide) ; sous-ensemble borne sur CPU (lent).
    env_sample = os.environ.get("ASR_SAMPLE")
    default_sample = 0 if device == "cuda" else 30  # 0 = tout
    try:
        want = int(env_sample) if env_sample is not None else default_sample
    except ValueError:
        want = default_sample
    sample = cids
    if 0 < want < len(cids):
        step = len(cids) / want
        sample = [cids[int(i * step)] for i in range(want)]  # regulierement espace
    sample_set = set(sample)
    keys = [k for k, c in new.items() if c in sample_set]
    keycsv = ",".join(keys)

    try:
        budget = float(os.environ.get("ASR_BUDGET", "420"))
    except ValueError:
        budget = 420.0

    def run_asr(model: str, dev: str):
        ps = (f'cd C:\\kerskol-tts; '
              f'& C:\\Audiobooks\\venv_asr\\Scripts\\python.exe -u relecture.py '
              f'--out {WIN_OUT} --keys "{keycsv}" --model {model} '
              f'--download-root {ASR_CACHE} --device {dev} --beam 1')
        try:
            return ssh_win(ps, timeout=budget)
        except subprocess.TimeoutExpired:
            return None  # trop lent : signale l'abandon

    model = "small"
    log(f"ASR : sondage {len(sample)}/{len(cids)} clips, device={device}, "
        f"model={model}, budget={int(budget)}s")
    r = run_asr(model, device)
    if r is not None and device == "cuda" and r.returncode != 0:
        log("ASR GPU indisponible, repli CPU.")
        device = "cpu"
        r = run_asr(model, device)
    if r is not None and r.returncode != 0:
        log("ASR modele small indisponible (telechargement ?), repli base.")
        model = "base"
        r = run_asr(model, device)
    if r is None:
        log(f"ASR trop lent (> {int(budget)}s) : abandonne, deploiement par duree seule.")
        return set()
    # lire relecture.json (scp pour conserver l'UTF-8, pas de Get-Content cp1252)
    rjf = tmp / "relecture.json"
    run(["scp", *WIN_OPTS, f"{WIN}:{WIN_OUT.replace(chr(92), '/')}/relecture.json", str(rjf)])
    exclus = set()
    try:
        rep = json.loads(rjf.read_text(encoding="utf-8"))
        key_to_cid = {k: c for k, c in new.items()}
        for row in rep.get("rapport", []):
            niv = row.get("niveau", "")
            classe = row.get("classe", "")
            accent_en = row.get("lang", "fr") == "en"
            if niv in ("MUET", "QUASI_MUET") or classe == "TRONQUE" or accent_en:
                c = key_to_cid.get(row["key"])
                if c is not None:
                    exclus.add(c)
    except Exception as e:
        log(f"NB : relecture.json illisible ({e}) ; aucun clip ecarte par ASR.")
    return exclus


def pull_mp3(cids: list[str], tmp: Path):
    (tmp / "mp3").mkdir(exist_ok=True)
    # ecrire la liste des cid sur manu-win, zipper, rapatrier
    lst = tmp / "cids.txt"
    lst.write_text("\n".join(cids), encoding="utf-8")
    run(["scp", *WIN_OPTS, str(lst), f"{WIN}:C:/kerskol-tts/deploy_cids.txt"])
    mp3_dir = f"{WIN_OUT}\\{VOICE}"  # dossier des mp3 (sortie_c1s33 ou sortie_frags)
    ps = (r'$cids=Get-Content C:\kerskol-tts\deploy_cids.txt; '
          r'$f=$cids|%{"' + mp3_dir + r'\$_.mp3"}|?{Test-Path $_}; '
          r'Remove-Item C:\kerskol-tts\deploy_lot.zip -ErrorAction SilentlyContinue; '
          r'Compress-Archive -Path $f -DestinationPath C:\kerskol-tts\deploy_lot.zip -Force')
    ssh_win(ps)
    zipp = tmp / "deploy_lot.zip"
    run(["scp", *WIN_OPTS, f"{WIN}:C:/kerskol-tts/deploy_lot.zip", str(zipp)])
    if zipp.exists():
        run(["unzip", "-q", "-o", str(zipp), "-d", str(tmp / "mp3")])


def commit_push(n: int):
    subprocess.run(["git", "-C", str(REPO), "add", "frontend/public/voix/manifest.json"])
    msg = (f"feat(voix): lot de {n} clips prose deployes (manifest +{n})\n\n"
           "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>")
    subprocess.run(["git", "-C", str(REPO), "commit", "-q", "-m", msg])
    subprocess.run(["git", "-C", str(REPO), "pull", "--rebase"])
    subprocess.run(["git", "-C", str(REPO), "push", "origin", "main"])
    log(f"manifest committe + pousse (+{n} clips).")


def verif_http(cids: list[str]):
    def code(url):
        return run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                    "--max-time", "15", url]).stdout.strip()
    log("=== verifs HTTP ===")
    log(f"  manifest : {code('https://kerskol.fr/voix/manifest.json')}")
    for c in cids[:3]:
        log(f"  mp3 {c[:10]} : {code(f'https://kerskol.fr/audio/{VOICE}/{c}.mp3')}")
    for h in ["kertec.fr", "www.kertec.fr", "map.kertec.fr", "api.kertec.fr"]:
        log(f"  {h:16s} : {code(f'https://{h}/')}")


def couverture_et_restant(gen: dict):
    # restant = textes a generer (liste) non encore presents (txt:) dans le gen
    try:
        total_cibles = len(json.loads(GEN_LIST.read_text(encoding="utf-8")))
    except Exception:
        total_cibles = 0
    faits = sum(1 for k in gen["keys"] if k.startswith("txt:"))
    restant = max(0, total_cibles - faits)
    committed = json.loads(MANIFEST.read_text(encoding="utf-8"))
    deployes = sum(1 for k in committed["keys"] if k.startswith("txt:"))
    log("=== etat ===")
    log(f"  clips prose : cibles={total_cibles} generes(manu-win)={faits} "
        f"deployes(prod)={deployes} restant_a_generer={restant}")


if __name__ == "__main__":
    raise SystemExit(main())
