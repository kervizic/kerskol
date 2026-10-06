#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verbalisation des nombres en francais (0..10000) pour la synthese vocale.

Sert UNIQUEMENT a produire le TEXTE a synthetiser pour chaque clip "nombre".
La decomposition d'un nombre en sequence de clips (cote client) vit dans le
front (frontend/src/lib/voix/verbalize.ts) et NE depend PAS de l'orthographe :
les deux cotes doivent seulement s'accorder sur QUELS clips atomiques existent
(0..999 et les milliers 1000,2000..10000), ce qui est garanti par ce module.

Orthographe (rectifications 1990 NON appliquees : graphie classique attendue a
l'ecole) : "quatre-vingts" / "quatre-vingt-un", "deux cents" / "deux cent un",
"soixante et onze", "mille" invariable.
"""
from __future__ import annotations

_UNITES = [
    "zero", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit",
    "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
    "dix-sept", "dix-huit", "dix-neuf",
]
# accents poses explicitement (source ASCII-safe volontaire)
_UNITES[0] = "zéro"  # zéro

_DIZAINES = {2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante",
             6: "soixante", 8: "quatre-vingt"}


def _deux_chiffres(n: int) -> str:
    """0..99."""
    if n < 20:
        return _UNITES[n]
    d, u = divmod(n, 10)
    if d == 7 or d == 9:
        base = "soixante" if d == 7 else "quatre-vingt"
        reste = 10 + u  # 10..19
        if d == 7 and u == 1:
            return "soixante et onze"
        return f"{base}-{_UNITES[reste]}"
    mot = _DIZAINES[d]
    if u == 0:
        return "quatre-vingts" if d == 8 else mot
    if u == 1 and d in (2, 3, 4, 5, 6):
        return f"{mot} et un"
    return f"{mot}-{_UNITES[u]}"


def _trois_chiffres(n: int) -> str:
    """0..999."""
    c, r = divmod(n, 100)
    if c == 0:
        return _deux_chiffres(r)
    cent = "cent" if c == 1 else f"{_UNITES[c]} cent"
    if r == 0:
        return cent + ("s" if c > 1 else "")
    return f"{cent} {_deux_chiffres(r)}"


def nombre_en_lettres(n: int) -> str:
    """0..10000 en toutes lettres (francais)."""
    if n < 0 or n > 10000:
        raise ValueError(f"hors plage 0..10000 : {n}")
    if n < 1000:
        return _trois_chiffres(n)
    m, r = divmod(n, 1000)
    mille = "mille" if m == 1 else f"{_trois_chiffres(m)} mille"
    return mille if r == 0 else f"{mille} {_trois_chiffres(r)}"


# --- cles logiques (identiques cote front) --------------------------------- #
def cle_nombre(n: int) -> str:
    return f"num:{n}"


def decomposer(n: int) -> list[str]:
    """Nombre -> sequence de cles de clips atomiques (doit refleter verbalize.ts)."""
    if n < 1000:
        return [cle_nombre(n)]
    milliers = (n // 1000) * 1000
    reste = n % 1000
    out = [cle_nombre(milliers)]
    if reste:
        out.append(cle_nombre(reste))
    return out


def nombres_atomiques() -> list[int]:
    """Tous les nombres necessitant un clip : 0..999 + milliers 1000..10000."""
    return list(range(0, 1000)) + [1000 * k for k in range(1, 11)]


if __name__ == "__main__":
    for x in [0, 1, 17, 21, 27, 71, 80, 81, 90, 91, 100, 200, 201, 534,
              999, 1000, 2000, 2534, 10000]:
        print(f"{x:5d} -> {nombre_en_lettres(x)}   decomp={decomposer(x)}")
