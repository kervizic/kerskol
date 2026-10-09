// Ecran « Parcours d'Histoire » (CM1). Liste les chapitres (groupes par theme),
// lance un <Parcours>, et donne acces a la frise personnelle en consultation.
//
// Branchements serveur (serveur seul juge + EMA existant) :
//   - questions + « je retiens » : insertReponse(op 'qm', cle) -> verif_qm +
//     progression (EMA). Les reponses sont rattachees a une seance creee a
//     l'entree d'un chapitre.
//   - frise : frisePlacer(profil, cle, ordre) -> frise_placer (verif de l'ordre,
//     stockage par profil). friseEtat recharge la frise.
// Mode demo : jugement LOCAL (miroir), aucune requete reseau.

import { useEffect, useMemo, useState } from "react";
import { ScrollText, Clock } from "lucide-react";
import Parcours from "../components/Parcours";
import Frise from "../components/Frise";
import {
  PARCOURS_HISTOIRE,
  itemsParcoursTousQm,
  friseCarteParCle,
  estJusteParcoursQm,
  type ParcoursChapitre,
  type FriseCarte,
} from "../domain/histoire/parcours";
import { createSeance, finishSeance, friseEtat, frisePlacer, insertReponse } from "../lib/api";
import { isDemo } from "../lib/demo";
import type { Profil } from "../lib/types";

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// cle d'item QM -> (competence, niveau), pour construire la reponse serveur.
const QM_INDEX = new Map(itemsParcoursTousQm().map((i) => [i.cle, i]));

// Chapitres groupes par theme (dans l'ordre du catalogue).
function groupesParTheme(): Array<{ theme: string; chapitres: ParcoursChapitre[] }> {
  const out: Array<{ theme: string; chapitres: ParcoursChapitre[] }> = [];
  for (const c of PARCOURS_HISTOIRE) {
    const g = out.find((x) => x.theme === c.theme);
    if (g) g.chapitres.push(c);
    else out.push({ theme: c.theme, chapitres: [c] });
  }
  return out;
}

export function Histoire({ profil, onExit }: { profil: Profil; onExit: () => void }) {
  const [clesPlacees, setClesPlacees] = useState<string[] | null>(null);
  const [chapitre, setChapitre] = useState<ParcoursChapitre | null>(null);
  const [voirFrise, setVoirFrise] = useState(false);
  const [seanceId, setSeanceId] = useState<string | null>(null);
  const groupes = useMemo(groupesParTheme, []);

  // Charge la frise du profil.
  useEffect(() => {
    let alive = true;
    friseEtat(profil.id)
      .then((cles) => alive && setClesPlacees(cles))
      .catch(() => alive && setClesPlacees([]));
    return () => {
      alive = false;
    };
  }, [profil.id]);

  // Cartes placees (resolues depuis le contenu front), triees chronologiquement.
  const cartesPlacees: FriseCarte[] = useMemo(() => {
    const cles = clesPlacees ?? [];
    return cles
      .map((cle) => friseCarteParCle(cle))
      .filter((c): c is FriseCarte => Boolean(c))
      .sort((a, b) => a.cleTri - b.cleTri);
  }, [clesPlacees]);

  // Demarre un chapitre : cree une seance pour rattacher les reponses.
  async function demarrer(c: ParcoursChapitre) {
    const id = uuid();
    setSeanceId(id);
    setChapitre(c);
    try {
      await createSeance(id, profil.id);
    } catch {
      /* la seance est best-effort ; les reponses restent verifiees par le serveur */
    }
  }

  // Soumission d'une question / d'un trou (op 'qm'). Serveur seul juge.
  async function onSoumettre(cle: string, reponseTexte: string): Promise<{ correct: boolean } | null> {
    if (isDemo()) return { correct: estJusteParcoursQm(cle, reponseTexte) };
    const item = QM_INDEX.get(cle);
    if (!item || !seanceId) return null;
    try {
      const r = await insertReponse({
        id: uuid(),
        profil_id: profil.id,
        seance_id: seanceId,
        competence: item.competence,
        exercice_id: null,
        niveau: item.niveau,
        methode: null,
        op: "qm",
        a: 0,
        b: 0,
        cle,
        reponse: 0,
        reste: null,
        fields: 1,
        temps_ms: null,
        correction_lue: false,
        rattrapage: false,
        placement: false,
        repondu_le: new Date().toISOString(),
        mode: "seance",
        reponse_texte: reponseTexte,
      });
      return { correct: r.correct };
    } catch {
      return null;
    }
  }

  // Placement d'une carte de frise (op frise_placer).
  async function onPlacerFrise(cle: string, ordreCles: string[]): Promise<{ correct: boolean } | null> {
    const r = await frisePlacer(profil.id, cle, ordreCles);
    if (r?.correct) {
      // Rafraichit l'etat local (la carte est acquise).
      setClesPlacees((prev) => (prev && prev.includes(cle) ? prev : [...(prev ?? []), cle]));
    }
    return r;
  }

  // Fin d'un chapitre : cloture la seance, recharge la frise, retour a la liste.
  async function terminer() {
    if (seanceId) {
      try {
        await finishSeance(seanceId, { duree_s: 0, monnaie_gagnee: 0 });
      } catch {
        /* best-effort */
      }
    }
    try {
      const cles = await friseEtat(profil.id);
      setClesPlacees(cles);
    } catch {
      /* on garde l'etat local */
    }
    setChapitre(null);
    setSeanceId(null);
  }

  // --- Vue : un chapitre en cours -----------------------------------------
  if (chapitre) {
    // Cartes deja placees HORS celles de ce chapitre (evite les doublons en rejeu).
    const base = cartesPlacees.filter((c) => !chapitre.frise.some((fc) => fc.cle === c.cle));
    return (
      <div className="kk-page" style={{ padding: 16 }}>
        <Parcours
          chapitre={chapitre}
          frisePlacees={base}
          onSoumettre={onSoumettre}
          onPlacerFrise={onPlacerFrise}
          onTermine={() => void terminer()}
          onQuitter={() => void terminer()}
        />
      </div>
    );
  }

  // --- Vue : consultation de la frise -------------------------------------
  if (voirFrise) {
    return (
      <div className="kk-page" style={{ padding: 16 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Frise cartes={cartesPlacees} titre="Ma frise du temps" onContinuer={() => setVoirFrise(false)} />
        </div>
      </div>
    );
  }

  // --- Vue : liste des chapitres ------------------------------------------
  return (
    <div className="kk-page" style={{ padding: 16 }}>
      <div className="kk-stack" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="kk-row" style={{ alignItems: "center", gap: 8 }}>
          <button className="kk-btn" onClick={onExit} aria-label="Retour à mon village">←</button>
          <h1 style={{ margin: 0, flex: 1 }}>
            <ScrollText size={22} aria-hidden="true" /> Parcours d'Histoire
          </h1>
        </div>
        <p className="kk-muted" style={{ margin: 0 }}>
          Choisis un chapitre. Tu liras un récit, tu répondras à des questions, tu gagneras des cartes pour ta frise,
          et tu retiendras les mots importants.
        </p>

        <button className="kk-btn kk-btn--block" onClick={() => setVoirFrise(true)}>
          <Clock size={18} aria-hidden="true" /> Voir ma frise ({cartesPlacees.length} carte{cartesPlacees.length > 1 ? "s" : ""})
        </button>

        {groupes.map((g) => (
          <section key={g.theme} className="kk-stack" style={{ gap: 8 }}>
            <h2 style={{ margin: "8px 0 0", fontSize: "1rem" }}>{g.theme}</h2>
            {g.chapitres.map((c) => {
              const fait = c.frise.every((fc) => (clesPlacees ?? []).includes(fc.cle));
              return (
                <button key={c.cle} className="kk-btn kk-btn--block" style={{ textAlign: "left" }}
                  onClick={() => void demarrer(c)}>
                  {fait ? "✅ " : ""}{c.titre}
                  <span className="kk-muted" style={{ display: "block", fontSize: "0.8rem" }}>
                    {c.personnage}
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
