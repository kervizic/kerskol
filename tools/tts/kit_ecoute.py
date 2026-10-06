#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kit d'ecoute cible (A3) : Whisper ne controle pas la PRONONCIATION.

Selectionne les clips a risque de prononciation et produit UNE page HTML
autonome (sons embarques en data: URI). A NE PAS committer ni deployer : la page
est deposee hors repo (defaut ~/Documents/Programmation/kerskol-kits).

Risques couverts : liaisons des nombres (« vingt et un », « cent un »,
« six cents », « dix-huit »...), homographes (plus, os, as, vis, couvent, est,
fils, sens, tous, plans), ligatures Œ/Æ, mots composes a trait d'union,
noms propres / majuscules isolees.

Usage (PC) : python kit_ecoute.py --out C:\\kerskol-tts\\sortie --html C:\\kerskol-tts\\kit_ecoute.html
"""
from __future__ import annotations

import argparse
import base64
import html
import json
import re
from pathlib import Path

HOMOGRAPHES = {"plus", "os", "as", "vis", "couvent", "est", "fils", "sens", "tous", "plans"}
# consonne finale muette frequente (retour d'ecoute Manu : « chat » lu « chate »)
CONSONNE_FINALE = {"chat", "chats", "petit", "petits", "tout", "tous", "gros", "nez",
                   "dos", "lit", "lits", "nuit", "nuits", "haut", "pied", "pieds",
                   "loup", "loups", "vent", "vents", "bout", "bouts", "sang", "plus",
                   "os", "fils", "rat", "rats", "pot", "pots", "mot", "mots", "temps"}
# nombres a liaison delicate
NOMBRES_RISQUE = set([18, 80, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
                     + [21, 31, 41, 51, 61, 71, 81, 91]
                     + [101, 201, 301, 601, 1001])


def _raisons(key: str, texte: str) -> list[str]:
    r = []
    low = texte.lower()
    mots = re.findall(r"[0-9a-zà-öø-ÿœæ]+", low)
    if key.startswith("num:"):
        try:
            n = int(key.split(":")[1])
            if n in NOMBRES_RISQUE:
                r.append("liaison nombre")
        except ValueError:
            pass
    if any(m in HOMOGRAPHES for m in mots):
        r.append("homographe")
    if any(m in CONSONNE_FINALE for m in mots):
        r.append("consonne finale muette")
    if "œ" in low or "æ" in low:
        r.append("ligature")
    if "-" in texte and not key.startswith("num:"):
        r.append("trait d'union")
    # majuscule en milieu de phrase (nom propre) hors 1er mot
    tokens = texte.split()
    for w in tokens[1:]:
        if w[:1].isupper():
            r.append("nom propre / majuscule")
            break
    return r


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--html", required=True)
    ap.add_argument("--max", type=int, default=80)
    a = ap.parse_args()

    out = Path(a.out)
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    voice = man["voice"]
    vdir = out / voice
    cid2key = {}
    for k, cid in man["keys"].items():
        cid2key.setdefault(cid, k)

    selection = []
    for cid, info in man["clips"].items():
        key = cid2key.get(cid, cid)
        raisons = _raisons(key, info["text"])
        if raisons:
            selection.append((raisons, key, cid, info["text"]))
    # priorite : plusieurs raisons d'abord, puis non-nombres
    selection.sort(key=lambda x: (-len(x[0]), x[1].startswith("num:")))
    selection = selection[: a.max]

    lignes = []
    for raisons, key, cid, texte in selection:
        mp3 = vdir / f"{cid}.mp3"
        if not mp3.exists():
            continue
        b64 = base64.b64encode(mp3.read_bytes()).decode("ascii")
        lignes.append(
            f'<tr><td>{html.escape(", ".join(raisons))}</td>'
            f'<td><code>{html.escape(key)}</code></td>'
            f'<td>{html.escape(texte)}</td>'
            f'<td><audio controls preload="none" src="data:audio/mpeg;base64,{b64}"></audio></td></tr>')

    page = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Kit d'ecoute voix Kerskol ({voice})</title>
<style>
 body{{font-family:system-ui,sans-serif;margin:24px;max-width:1000px}}
 h1{{font-size:1.3rem}} table{{border-collapse:collapse;width:100%}}
 td,th{{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:middle}}
 code{{background:#f3f3f3;padding:1px 4px;border-radius:3px}}
 tr:nth-child(even){{background:#fafafa}} audio{{height:32px}}
</style></head><body>
<h1>Kit d'ecoute - {len(lignes)} clips a risque de prononciation ({voice})</h1>
<p>Ecoute chaque clip ; note ceux a corriger (graphie dans <code>texte_lu</code>,
jamais le texte affiche). Page autonome, hors site.</p>
<table><thead><tr><th>Risque</th><th>Cle</th><th>Texte</th><th>Son</th></tr></thead>
<tbody>
{chr(10).join(lignes)}
</tbody></table></body></html>"""

    Path(a.html).write_text(page, encoding="utf-8")
    print(f"kit ecrit : {a.html} ({len(lignes)} clips)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
