#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Nettoyage du texte ENVOYE au moteur TTS (jamais le texte affiche).

Source UNIQUE du nettoyage (miroir de C:\\Audiobooks\\pipeline\\core.py :
nettoyer_tts) afin que le hash d'identite d'un clip soit IDENTIQUE cote Mac
(comptage/catalogue) et cote PC Windows (generation). Regles imposees par Manu :
retirer guillemets « » " " " et l'espace associee ; pas d'espace apres apostrophe ;
© -> copyright ; ( et ) -> virgules ; reduction des espaces.
"""
from __future__ import annotations

import hashlib
import re

VOICE_VERSION = "naf_D-v1"


def nettoyer(t: str) -> str:
    if not t:
        return ""
    # 1) guillemets ouvrants (« et courbes) : retirer avec l'espace interne
    t = re.sub(r"[«“„]\s*", "", t)
    t = re.sub(r"\s*[»”]", "", t)
    # 2) guillemets droits : retirer le caractere
    t = t.replace('"', "")
    # 3) espace parasite apres une apostrophe d'elision
    t = re.sub(r"(['’])\s+", lambda m: m.group(1), t)
    # 4) copyright
    t = t.replace("©", "copyright ")
    # 4bis) parentheses a lire -> incise entre virgules
    t = re.sub(r"\s*\(\s*", ", ", t)
    t = re.sub(r"\s*\)\s*", ", ", t)
    # 5) espaces + ponctuation
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r",\s*([,.;:!?])", r"\1", t)
    t = re.sub(r"\s+([,.])", r"\1", t)
    t = re.sub(r"\s*([;:!?])", r" \1", t)
    t = re.sub(r"^\s*,\s*", "", t)
    t = re.sub(r"\s*,\s*$", "", t)
    return t.strip()


def clip_id(texte_nettoye: str, voice: str = VOICE_VERSION) -> str:
    """Identite physique d'un clip : hash du texte nettoye + version de voix."""
    h = hashlib.sha1(f"{voice}\x1f{texte_nettoye}".encode("utf-8")).hexdigest()
    return h[:16]


if __name__ == "__main__":
    for s in ['« Bonjour »', "l' instant", "27 ÷ 3", "A (environ) B"]:
        c = nettoyer(s)
        print(f"{s!r:22} -> {c!r}  id={clip_id(c)}")
