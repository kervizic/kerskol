#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extraction des dictees depuis les migrations SQL + reconstruction du texte CORRECT.

La table dictee_texte stocke le texte AFFICHE (avec les fautes plantees) ; la
voix doit lire la version CORRIGEE (jamais la version piegee : la plupart des
fautes sont des homophones inaudibles). On reconstruit le texte correct en
appliquant dictee_erreur (mot -> cor a la occ-ieme occurrence), exactement comme
le helper SQL _dictee_add aligne les positions.

Source canonique :
  - ids 1..40   : 0032_francais_dictee_detective.sql (arite 5 : sans notion)
  - ids 101..160: 0035_francais_dictee_accents.sql   (arite 6 : avec accents)
    (0033 est SUPERSEDE par 0035 : meme ids, memes fautes, accents corriges.)
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
from pathlib import Path


def _migrations_dir() -> Path:
    """Repertoire des migrations SQL. Override via KERSKOL_MIGRATIONS (PC Windows
    ou le repo n'est pas monte en entier) ; sinon ./migrations a cote du script ;
    sinon le repo (supabase/migrations)."""
    env = os.environ.get("KERSKOL_MIGRATIONS")
    if env:
        return Path(env)
    local = Path(__file__).resolve().parent / "migrations"
    if local.exists():
        return local
    return Path(__file__).resolve().parents[2] / "supabase" / "migrations"


_MIGRATIONS = _migrations_dir()
_SRC = {
    "0032_francais_dictee_detective.sql": 5,   # id,niveau,theme,texte,erreurs
    "0035_francais_dictee_accents.sql": 6,     # id,niveau,notion,theme,texte,erreurs
}

_BORDER = "[.,;:!?«»\"'()…]"


def _norm_mot(s: str) -> str:
    """Miroir de public.normaliser_mot : minuscules, bornes de ponctuation otees.
    Accents CONSERVES (accents exiges par la dictee)."""
    s = s.strip().lower()
    s = re.sub(f"^{_BORDER}+", "", s)
    s = re.sub(f"{_BORDER}+$", "", s)
    return s


def _parse_sql_args(blob: str) -> list[str]:
    """Decoupe les arguments d'un appel _dictee_add en respectant les chaines SQL
    (quote '' = apostrophe litterale) et en ignorant les casts ::jsonb."""
    args: list[str] = []
    i, n = 0, len(blob)
    cur = ""
    in_str = False
    while i < n:
        ch = blob[i]
        if in_str:
            if ch == "'":
                if i + 1 < n and blob[i + 1] == "'":
                    cur += "'"
                    i += 2
                    continue
                in_str = False
                i += 1
                continue
            cur += ch
            i += 1
            continue
        if ch == "'":
            in_str = True
            cur = ""
            i += 1
            continue
        if ch == ",":
            args.append(cur.strip())
            cur = ""
            i += 1
            continue
        cur += ch
        i += 1
    if cur.strip():
        args.append(cur.strip())
    # nettoie les tokens non-chaine (nombres, ::jsonb) deja captures bruts
    return args


def _appliquer_corrections(texte: str, erreurs: list[dict]) -> str:
    """Remplace chaque mot fautif par sa correction (occ-ieme occurrence)."""
    toks = re.split(r"(\s+)", texte)  # garde les separateurs
    mots_idx = [k for k, t in enumerate(toks) if t.strip()]
    # 1) resoudre toutes les positions sur le texte ORIGINAL (non mute)
    remplacements: list[tuple[int, str]] = []
    for e in erreurs:
        cible = _norm_mot(e["mot"])
        occ = int(e.get("occ", 1))
        seen = 0
        pos = None
        for k in mots_idx:
            if _norm_mot(toks[k]) == cible:
                seen += 1
                if seen == occ:
                    pos = k
                    break
        if pos is None:
            raise ValueError(f"mot « {e['mot']} » occ {occ} introuvable dans : {texte}")
        remplacements.append((pos, e["cor"]))
    # 2) appliquer (coeur alphabetique remplace, ponctuation de bord gardee)
    for pos, cor in remplacements:
        m = re.match(f"^({_BORDER}*)(.*?)({_BORDER}*)$", toks[pos])
        toks[pos] = f"{m.group(1)}{cor}{m.group(3)}"
    return "".join(toks)


def _phrases(texte: str) -> list[str]:
    """Decoupe en phrases sur . ! ? (ponctuation conservee)."""
    parts = re.findall(r"[^.!?]+[.!?]+|\S[^.!?]*$", texte.strip())
    return [p.strip() for p in parts if p.strip()]


def charger_dictees() -> list[dict]:
    out: list[dict] = []
    for fichier, arite in _SRC.items():
        texte_sql = (_MIGRATIONS / fichier).read_text(encoding="utf-8")
        for m in re.finditer(r"SELECT\s+public\._dictee_add\((.*?)\)\s*;",
                             texte_sql, re.DOTALL):
            raw = m.group(1)
            args = _parse_sql_args(raw)
            if arite == 5:
                _id, niveau, theme, texte, erreurs_s = args[0], args[1], args[2], args[3], args[4]
                notion = None
            else:
                _id, niveau, notion, theme, texte, erreurs_s = args[:6]
            erreurs_s = re.sub(r"::\w+\s*$", "", erreurs_s).strip()
            erreurs = json.loads(erreurs_s)
            corrige = _appliquer_corrections(texte, erreurs)
            out.append({
                "id": int(_id),
                "niveau": int(niveau),
                "notion": notion,
                "theme": theme,
                "texte_pige": texte,
                "texte_correct": corrige,
                "phrases": _phrases(corrige),
            })
    out.sort(key=lambda d: d["id"])
    return out


if __name__ == "__main__":
    ds = charger_dictees()
    print(f"{len(ds)} dictees, "
          f"{sum(len(d['phrases']) for d in ds)} phrases au total")
    for d in ds[:3] + [x for x in ds if x["id"] in (1, 104, 107)]:
        print(f"\n#{d['id']} n{d['niveau']} [{d['theme']}] ({len(d['phrases'])} phrases)")
        print("  pige  :", d["texte_pige"])
        print("  correct:", d["texte_correct"])
        for i, p in enumerate(d["phrases"]):
            print(f"    s{i}: {p}")
