#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Construction du CATALOGUE de clips voix (source unique).

Un clip = {key, text, cat}. La cle logique (key) est ce que le front interroge
(il ne recalcule jamais le texte des dictees/messages). L'identite PHYSIQUE d'un
clip est le hash du texte nettoye + version de voix (nettoyage.clip_id) : deux
cles de meme texte nettoye partagent le meme fichier (dedup naturel).

Categories : nombre, operateur, consigne, message, titre, indice, dictee.

Usage :
  python catalogue.py            # catalogue complet : comptes par categorie
  python catalogue.py --pilot    # sous-ensemble pilote (~50 clips)
  python catalogue.py --json OUT # ecrit la liste [{key,text,cat}] dans OUT
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from dictees import charger_dictees
from nettoyage import clip_id, nettoyer
from nombres_fr import nombre_en_lettres, nombres_atomiques

_DATA = Path(__file__).resolve().parent / "data" / "phrases.json"

# sous-ensembles du pilote
PILOT_DICTEES = [1, 104]
PILOT_NOMBRES = list(range(0, 31))           # 0..30
PILOT_OPERATEURS = ["op:plus", "op:moins", "op:fois", "op:divise", "op:egale"]
PILOT_CONSIGNES = ["consigne:ecoute-bien", "consigne:a-toi-de-jouer",
                   "consigne:lis-la-consigne", "consigne:prends-ton-temps",
                   "consigne:c-est-parti"]
PILOT_MESSAGES = ["msg:bravo", "msg:presque", "msg:detective-tout-trouve",
                  "msg:mille-invariable", "msg:verifie-ta-reponse"]


def construire(pilot: bool = False) -> list[dict]:
    data = json.loads(_DATA.read_text(encoding="utf-8"))
    clips: list[dict] = []

    # 1) nombres
    nums = PILOT_NOMBRES if pilot else nombres_atomiques()
    for n in nums:
        clips.append({"key": f"num:{n}", "text": nombre_en_lettres(n), "cat": "nombre"})

    # 2) phrases statiques (operateur/consigne/message/titre)
    def _ajouter(cat: str, sel: list[str] | None):
        d = data.get(cat, {})
        keys = sel if sel is not None else [k for k in d if not k.startswith("_")]
        for k in keys:
            clips.append({"key": k, "text": d[k], "cat": cat})

    _ajouter("operateur", PILOT_OPERATEURS if pilot else None)
    _ajouter("consigne", PILOT_CONSIGNES if pilot else None)
    _ajouter("message", PILOT_MESSAGES if pilot else None)
    if not pilot:
        _ajouter("titre", None)
        _ajouter("indice", None)

    # 3) dictees (version CORRIGEE, une phrase = un clip)
    dictees = charger_dictees()
    if pilot:
        dictees = [d for d in dictees if d["id"] in PILOT_DICTEES]
    for d in dictees:
        for i, phrase in enumerate(d["phrases"]):
            clips.append({"key": f"dictee:{d['id']}:s{i}", "text": phrase, "cat": "dictee"})

    return clips


def comptes(clips: list[dict]) -> dict:
    par_cat: dict[str, int] = {}
    ids = set()
    for c in clips:
        par_cat[c["cat"]] = par_cat.get(c["cat"], 0) + 1
        ids.add(clip_id(nettoyer(c["text"])))
    return {"total_cles": len(clips), "par_categorie": par_cat,
            "clips_physiques_uniques": len(ids)}


def _estimation_gpu(n_clips: int, sec_par_clip: float = 4.0) -> str:
    tot = n_clips * sec_par_clip
    return f"~{tot/60:.0f} min ({n_clips} clips x {sec_par_clip:.1f}s, a affiner apres pilote)"


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--json", default=None)
    a = ap.parse_args()
    clips = construire(pilot=a.pilot)
    c = comptes(clips)
    print(("PILOTE " if a.pilot else "COMPLET ") + json.dumps(c, ensure_ascii=False, indent=2))
    print("estimation GPU :", _estimation_gpu(c["clips_physiques_uniques"]))
    if a.json:
        Path(a.json).write_text(
            json.dumps(clips, ensure_ascii=False, indent=2), encoding="utf-8")
        print("ecrit :", a.json)
