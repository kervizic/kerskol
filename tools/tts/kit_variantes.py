#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kit de VARIANTES (retours d'ecoute de Manu). Synthetise, pour chaque cas
problematique, plusieurs graphies (texte_lu) et/ou graines, meme voix. Manu
ecoute et choisit UNE graphie par cas ; elle sera ensuite appliquee (texte_lu /
regle du generateur) et les clips concernes regeneres.

Produit UNE page HTML autonome (sons en data: URI), a deposer HORS repo
(~/Documents/Programmation/kerskol-kits/). A lancer sur le PC (GPU) APRES la
generation (modele libre).

Usage : python kit_variantes.py --html C:\\kerskol-tts\\kit_variantes.html
"""
from __future__ import annotations

import argparse
import base64
import html
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, r"C:\Audiobooks")
sys.path.insert(0, r"C:\Audiobooks\pipeline")

SEEDS = [1234, 4321, 2025, 777, 9999]

# Chaque cas : (titre, [ (etiquette, texte_a_synthetiser, [graines]) ])
CAS = [
    ("1. « chat » lu « chate » (consonne finale muette)", [
        ("graphie actuelle, toutes graines", "Le chat et le chien sont dans le jardin.", SEEDS),
        ("cha", "Le cha et le chien sont dans le jardin.", [1234, 4321]),
        ("chat seul", "chat", SEEDS),
        ("cha seul", "cha", [1234, 4321]),
    ]),
    ("2. lettre « s » isolee (message mille)", [
        ("actuel", "Jamais de s à mille. Mille ne change jamais.", [1234, 4321]),
        ("S majuscule", "Jamais de S à mille. Mille ne change jamais.", [1234, 4321]),
        ("esse", "Jamais de esse à mille. Mille ne change jamais.", [1234, 4321]),
        ("lettre S", "Jamais de lettre S à mille. Mille ne change jamais.", [1234, 4321]),
        ("esse, virgule", "Jamais de esse, à mille. Mille ne change jamais.", [1234, 4321]),
    ]),
    ("3. « divisé par » lu « divisé pas » (r avale)", [
        ("actuel", "divisé par", SEEDS),
        ("deux points", "divisé par :", [1234, 4321]),
        ("points de suspension", "divisé par…", [1234, 4321]),
        ("virgule", "divisé par,", [1234, 4321]),
        ("parr", "divisé parr", [1234, 4321]),
        ("pare", "divisé pare", [1234, 4321]),
    ]),
    ("3b. autres operateurs (seuls)", [
        ("plus", "plus", SEEDS), ("moins", "moins", SEEDS), ("fois", "fois", SEEDS),
        ("égale", "égale", SEEDS), ("Combien font", "Combien font", [1234, 4321]),
    ]),
    ("4. « un » (num:1)", [
        ("un", "un", SEEDS), ("un point", "un.", [1234, 4321]),
        ("Un point", "Un.", [1234, 4321]), ("un !", "un !", [1234, 4321]),
    ]),
    ("5. « vingt » et familles 20-29", [
        ("vingt actuel", "vingt", SEEDS),
        ("vin", "vin", [1234, 4321]),
        ("vingt et un", "vingt et un", [1234, 4321]),
        ("vingt-et-un (1990)", "vingt-et-un", [1234, 4321]),
        ("vinte-et-un (phon)", "vinte-et-un", [1234, 4321]),
        ("vingt-trois", "vingt-trois", [1234, 4321]),
        ("vinte-trois (phon)", "vinte-trois", [1234, 4321]),
        ("vingt-neuf", "vingt-neuf", [1234, 4321]),
        ("vinte-neuf (phon)", "vinte-neuf", [1234, 4321]),
        ("vinte-neufe (phon)", "vinte-neufe", [1234, 4321]),
    ]),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", required=True)
    a = ap.parse_args()

    import core
    import soundfile as sf
    from voix import VoixEngine
    from gen_kerskol import _encoder_mp3

    engine = VoixEngine()
    tmp = Path(tempfile.gettempdir())
    sections = []
    k = 0
    for titre, variantes in CAS:
        rows = []
        for etiquette, texte, seeds in variantes:
            for sd in seeds:
                k += 1
                w, sr, cap, d, pk, muet, emballe = engine.generer_bloc(texte, seed=sd)
                wavp = tmp / f"kv_{k}.wav"
                sf.write(str(wavp), w, sr, format="WAV", subtype="PCM_16")
                mp3p = tmp / f"kv_{k}.mp3"
                _encoder_mp3(wavp, mp3p, core)
                b64 = base64.b64encode(mp3p.read_bytes()).decode("ascii")
                rows.append(
                    f'<tr><td>{html.escape(etiquette)}</td>'
                    f'<td><code>{html.escape(texte)}</code></td><td>seed {sd}</td>'
                    f'<td><audio controls preload="none" src="data:audio/mpeg;base64,{b64}"></audio></td></tr>')
                wavp.unlink(missing_ok=True); mp3p.unlink(missing_ok=True)
        sections.append(f"<h2>{html.escape(titre)}</h2><table>"
                        "<thead><tr><th>Variante</th><th>texte_lu</th><th>graine</th><th>son</th></tr></thead>"
                        f"<tbody>{''.join(rows)}</tbody></table>")

    page = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Kit de variantes voix Kerskol</title>
<style>body{{font-family:system-ui,sans-serif;margin:24px;max-width:1000px}}
table{{border-collapse:collapse;width:100%;margin-bottom:28px}}
td,th{{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:middle}}
code{{background:#f3f3f3;padding:1px 4px;border-radius:3px}} audio{{height:32px}}
h2{{font-size:1.05rem;margin-top:24px}}</style></head><body>
<h1>Variantes a trancher ({k} clips)</h1>
<p>Pour chaque cas, choisis UNE variante (graphie + graine). Le texte AFFICHE ne
change jamais ; seul le texte_lu (ce qui est prononce) change. Page autonome.</p>
{''.join(sections)}</body></html>"""
    Path(a.html).write_text(page, encoding="utf-8")
    print(f"kit variantes ecrit : {a.html} ({k} clips)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
