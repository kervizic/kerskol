#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tokeniseur MIROIR de frontend/src/domain/francais/lecture/tokenize.ts.

But : produire EXACTEMENT la meme liste de mots (meme ordre) que le front, pour
que les timings par index collent au texte affiche. Le controle qualite TS
(controlerTimings) compare mot a mot : toute derive de tokenisation fait REJETER
le texte (filet de securite). On vise donc la coincidence stricte.

Regles (voir tokenize.ts) :
 - separation sur les espaces ; '\\n' = vers (ne change pas la liste des mots) ;
 - ponctuation de bord detachee (ne cree pas de mot) ;
 - morceau 100% ponctuation ignore (colle au mot precedent cote TS) ;
 - apostrophes / traits d'union INTERNES gardes (un seul mot).
"""
import re
import sys
import json

# \w en Unicode = lettres + chiffres + '_' ; proche de \p{L}|\p{N} du TS.
_LETTRE = re.compile(r"\w", re.UNICODE)


def _a_une_lettre(s: str) -> bool:
    return bool(_LETTRE.search(s))


def _decouper_bords(chunk: str):
    debut, fin = 0, len(chunk)
    while debut < fin and not _LETTRE.match(chunk[debut]):
        debut += 1
    while fin > debut and not _LETTRE.match(chunk[fin - 1]):
        fin -= 1
    return chunk[:debut], chunk[debut:fin], chunk[fin:]


def mots_du_corps(corps):
    """Retourne la liste ORDONNEE des mots (coeur, sans ponctuation de bord)."""
    mots = []
    for para in corps:
        for ligne in para.split("\n"):
            for chunk in ligne.split():
                _, coeur, _ = _decouper_bords(chunk)
                if _a_une_lettre(coeur):
                    mots.append(coeur)
    return mots


if __name__ == "__main__":
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    corps = data["corps"] if isinstance(data, dict) else data
    for m in mots_du_corps(corps):
        print(m)
