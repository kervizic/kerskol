#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Respelling du texte PRONONCE (jamais l'affichage, jamais nombres_fr).

Corrige des defauts d'ecoute connus de Qwen3-TTS (retours de Manu). Applique
au texte envoye au moteur ; l'affichage (UI, exercice « ecris en lettres »)
reste inchange. Le clip_id derive du texte prononce : seuls les clips corriges
changent d'identite (reprise-safe : les autres gardent leur mp3).

Regles :
- nombres : le t de « vingt » doit s'entendre devant 2..9 (vingt-quatre lu
  « vin-quatre ») -> « vinte- » ; JAMAIS dans quatre-vingt (81-89 : pas de t).
  « X et un/onze » (21,31,41,51,61,71) relie par des traits d'union.
- operateur « plus » lu « pu » -> « pluss » (toutes les operations).
- consignes encourageantes : point final -> « ! ».
- lettre isolee prononcee comme un son : « s » -> « esse » (message « mille »,
  accords). Fait par cle (surgical) pour ne pas toucher les « a » verbe, etc.
"""
from __future__ import annotations
import re

OPERATEUR = {"op:plus": "pluss"}

EXCLAM = {
    "consigne:ecoute-bien", "consigne:a-toi-de-jouer",
    "consigne:reflechis-bien", "consigne:prends-ton-temps",
}

# corrections de lettre isolee (par cle, pour rester sur) : le « s » doit se dire « esse »
LETTRE_FIX = {
    "msg:mille-invariable": "Jamais de esse à mille. Mille ne change jamais.",
    "msg:accord-sont-plusieurs":
        "Avec sont, on ajoute un esse à la fin pour plusieurs : ils sont allés.",
}


def _nombre(t: str) -> str:
    # 21,31,41,51,61,71 : « X et un/onze » -> « X-et-un/-onze »
    t = re.sub(r" et (un|onze)\b", r"-et-\1", t)
    # t de vingt entendu devant 2..9 (et dans les composes cent/mille), SAUF quatre-vingt
    t = re.sub(r"(?<!quatre-)vingt-", "vinte-", t)
    return t


def respeller(key: str, cat: str, text: str) -> str:
    """Texte a PRONONCER pour (key, cat, text affiche/nettoye)."""
    if key in LETTRE_FIX:
        return LETTRE_FIX[key]
    if key in OPERATEUR:
        return OPERATEUR[key]
    if cat == "nombre":
        return _nombre(text)
    if key in EXCLAM:
        s = text.rstrip()
        if s.endswith("!"):
            return s
        return re.sub(r"\.\s*$", "", s).rstrip() + " !"
    return text


if __name__ == "__main__":
    cas = [
        ("num:18", "nombre", "dix-huit", "dix-huit"),
        ("num:20", "nombre", "vingt", "vingt"),
        ("num:21", "nombre", "vingt et un", "vinte-et-un"),
        ("num:24", "nombre", "vingt-quatre", "vinte-quatre"),
        ("num:29", "nombre", "vingt-neuf", "vinte-neuf"),
        ("num:71", "nombre", "soixante et onze", "soixante-et-onze"),
        ("num:80", "nombre", "quatre-vingts", "quatre-vingts"),
        ("num:81", "nombre", "quatre-vingt-un", "quatre-vingt-un"),
        ("num:85", "nombre", "quatre-vingt-cinq", "quatre-vingt-cinq"),
        ("num:122", "nombre", "cent vingt-deux", "cent vinte-deux"),
        ("num:324", "nombre", "trois cent vingt-quatre", "trois cent vinte-quatre"),
        ("num:457", "nombre", "quatre cent cinquante-sept", "quatre cent cinquante-sept"),
        ("op:plus", "operateur", "plus", "pluss"),
        ("op:moins", "operateur", "moins", "moins"),
        ("consigne:ecoute-bien", "consigne", "Écoute bien.", "Écoute bien !"),
        ("consigne:a-toi-de-jouer", "consigne", "À toi de jouer.", "À toi de jouer !"),
        ("consigne:c-est-parti", "consigne", "C'est parti !", "C'est parti !"),
        ("msg:mille-invariable", "message", "Jamais de s à mille. Mille ne change jamais.",
         "Jamais de esse à mille. Mille ne change jamais."),
    ]
    ok = 0
    for key, cat, inp, exp in cas:
        got = respeller(key, cat, inp)
        flag = "OK " if got == exp else "FAIL"
        if got == exp: ok += 1
        print(f"{flag} {key:22} {inp!r:30} -> {got!r}")
    print(f"{ok}/{len(cas)} ok")
