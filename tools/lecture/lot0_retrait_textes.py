#!/usr/bin/env python3
"""LOT 0 (correction d'une decision de Manu, 9 octobre 2026).

Regle de contenu : on ne COUPE JAMAIS un texte pour le rendre acceptable ; si un
passage pose probleme, le texte ENTIER est retire.

Applique au kit `../kerskol-kits/bibliotheque-domaine-public/` le retrait complet
de 5 fiches (passage de `ton`/`statut_manu` a `retire`), met a jour `raison_ton`,
recalcule le pourcentage de textes ecartes et patche la figure dans `RAPPORT.md`.

- Retires : c2-050 (Le Chene et le Roseau), c2-026 (La Laitiere et le Pot au
  lait), c2-075 (L'Ours et les deux Compagnons) -- les 3 fables « recuperees »
  au lot 0065 en COUPANT leur corps ; c1-001 + c2-001 (Une souris verte, MS+CP).
- Garde : c3-033 (Renart et les anguilles) -- decision explicite de Manu.

IDEMPOTENT : relançable sans effet de bord. NE TOUCHE QUE LE KIT (hors cwd) ;
c'est pourquoi ce script est fourni a lancer a la main par Manu :

    python3 tools/lecture/lot0_retrait_textes.py
"""
from __future__ import annotations

import csv
import io
import json
import pathlib

KIT = pathlib.Path(__file__).resolve().parents[2] / "kerskol-kits" / "bibliotheque-domaine-public"

RETIRES = {
    "c2-050": "retire (lot 0068) : extrait coupe pour la bienveillance -> regle Manu, on ne coupe jamais un texte, on le retire entier",
    "c2-026": "retire (lot 0068) : extrait coupe pour la bienveillance -> regle Manu, on ne coupe jamais un texte, on le retire entier",
    "c2-075": "retire (lot 0068) : extrait coupe pour la bienveillance -> regle Manu, on ne coupe jamais un texte, on le retire entier",
    "c1-001": "retire (lot 0068, decision Manu) : comptine retiree entierement (humour pouvant gener) ; on ne coupe pas, on retire",
    "c2-001": "retire (lot 0068, decision Manu) : comptine retiree entierement (humour pouvant gener) ; on ne coupe pas, on retire",
}
GARDE_EXPLICITE = "c3-033"  # Renart et les anguilles : reste garde (verifie en fin de script).


def apply_json(path: pathlib.Path) -> tuple[int, int, int]:
    data = json.loads(path.read_text(encoding="utf-8"))
    for x in data:
        if x["id"] in RETIRES:
            x["ton"] = "retire"
            x["statut_manu"] = "retire"
            x["raison_ton"] = RETIRES[x["id"]]
    assert next(x for x in data if x["id"] == GARDE_EXPLICITE)["ton"] == "garde", \
        "Renart (c3-033) doit rester garde"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = len(data)
    retire = sum(1 for x in data if x["ton"] == "retire")
    return total, retire, total - retire


def apply_csv(path: pathlib.Path) -> None:
    rows = list(csv.DictReader(path.read_text(encoding="utf-8").splitlines()))
    fields = list(rows[0].keys())
    for r in rows:
        if r["id"] in RETIRES:
            r["ton"] = "retire"
            r["statut_manu"] = "retire"
            r["raison_ton"] = RETIRES[r["id"]]
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=fields, lineterminator="\n")
    w.writeheader()
    w.writerows(rows)
    path.write_text(buf.getvalue(), encoding="utf-8")


def patch_rapport(path: pathlib.Path, pct: str, garde: int, retire: int, total: int) -> None:
    txt = path.read_text(encoding="utf-8")
    txt = txt.replace("25,1 %", pct)
    txt = txt.replace(
        f"(58 `ton = retire` sur 231 fiches",
        f"({retire} `ton = retire` sur {total} fiches",
    )
    txt = txt.replace("Autrement dit **173 textes gardés**", f"Autrement dit **{garde} textes gardés**")
    path.write_text(txt, encoding="utf-8")


def main() -> None:
    total, retire, garde = apply_json(KIT / "catalogue.json")
    apply_csv(KIT / "catalogue.csv")
    pct = f"{retire / total * 100:.1f}".replace(".", ",") + " %"
    patch_rapport(KIT / "RAPPORT.md", pct, garde, retire, total)
    print(f"Catalogue : {total} fiches -> {garde} gardes, {retire} retires.")
    print(f"% textes ecartes : {pct}")
    print("Renart (c3-033) : garde. Souris verte (c1-001, c2-001) : retire. 3 fables (0065) : retire.")


if __name__ == "__main__":
    main()
