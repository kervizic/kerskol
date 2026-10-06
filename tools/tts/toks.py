#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""toks() - UNE seule fonction de decoupage en mots, partagee relecture/alignement.

DOIT etre byte-identique a frontend/src/lib/voix/toks.ts (jeu commun teste :
tools/tts/toks_fixture.json). Les chiffres sont convertis en lettres AVANT
tokenisation ; apostrophes et traits d'union deviennent des separateurs ; seuls
restent lettres (accents + ligatures) et chiffres residuels.

Deviation assumee vs la spec (num2words) : on utilise nombres_fr.nombre_en_lettres,
la MEME verbalisation que celle synthetisee (garantit la parite WER avec l'audio
genere et avec le portage TypeScript, qui reprend le meme algorithme)."""
from __future__ import annotations

import re
import unicodedata

from nombres_fr import nombre_en_lettres

_ALLOWED = re.compile(r"[^0-9a-zà-öø-ÿœæ\s]")


def _num(m: re.Match) -> str:
    try:
        return " " + nombre_en_lettres(int(m.group())) + " "
    except Exception:
        return " " + m.group() + " "


def toks(t: str) -> list[str]:
    if not t:
        return []
    t = unicodedata.normalize("NFC", t).lower()
    t = re.sub(r"\d+", _num, t)
    t = t.replace("’", " ").replace("'", " ").replace("-", " ")
    return _ALLOWED.sub(" ", t).split()


if __name__ == "__main__":
    import json
    import sys
    from pathlib import Path

    fx = json.loads((Path(__file__).parent / "toks_fixture.json").read_text(encoding="utf-8"))
    ko = 0
    for cas in fx:
        got = toks(cas["t"])
        ok = got == cas["toks"]
        if not ok:
            ko += 1
            print(f"KO  {cas['t']!r}\n    attendu {cas['toks']}\n    obtenu  {got}")
    print(f"{len(fx) - ko}/{len(fx)} cas OK")
    sys.exit(1 if ko else 0)
