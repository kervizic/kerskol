// Ecran « Parcours de Sciences » (CM1). Liste les chapitres et lance un
// <Parcours> (sans frise). Questions + « je retiens » alimentent l'EMA existant
// via insertReponse(op 'qm') sur les compétences ST.* ; serveur seul juge. Mode
// demo : jugement local.

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import Parcours from "../components/Parcours";
import {
  PARCOURS_SCIENCES,
  itemsParcoursSciencesTousQm,
  estJusteParcoursSciencesQm,
  type ParcoursChapitre,
} from "../domain/sciences/parcours";
import { createSeance, finishSeance, insertReponse } from "../lib/api";
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

const QM_INDEX = new Map(itemsParcoursSciencesTousQm().map((i) => [i.cle, i]));

export function SciencesParcours({ profil, onExit }: { profil: Profil; onExit: () => void }) {
  const [chapitre, setChapitre] = useState<ParcoursChapitre | null>(null);
  const [seanceId, setSeanceId] = useState<string | null>(null);

  async function demarrer(c: ParcoursChapitre) {
    const id = uuid();
    setSeanceId(id);
    setChapitre(c);
    try {
      await createSeance(id, profil.id);
    } catch {
      /* best-effort */
    }
  }

  async function onSoumettre(cle: string, reponseTexte: string): Promise<{ correct: boolean } | null> {
    if (isDemo()) return { correct: estJusteParcoursSciencesQm(cle, reponseTexte) };
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

  async function terminer() {
    if (seanceId) {
      try {
        await finishSeance(seanceId, { duree_s: 0, monnaie_gagnee: 0 });
      } catch {
        /* best-effort */
      }
    }
    setChapitre(null);
    setSeanceId(null);
  }

  if (chapitre) {
    return (
      <div className="kk-page" style={{ padding: 16 }}>
        <Parcours
          chapitre={chapitre}
          frisePlacees={[]}
          onSoumettre={onSoumettre}
          onPlacerFrise={async () => ({ correct: true })}
          onTermine={() => void terminer()}
          onQuitter={() => void terminer()}
        />
      </div>
    );
  }

  return (
    <div className="kk-page" style={{ padding: 16 }}>
      <div className="kk-stack" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="kk-row" style={{ alignItems: "center", gap: 8 }}>
          <button className="kk-btn" onClick={onExit} aria-label="Retour à mon village">←</button>
          <h1 style={{ margin: 0, flex: 1 }}>
            <FlaskConical size={22} aria-hidden="true" /> Parcours de Sciences
          </h1>
        </div>
        <p className="kk-muted" style={{ margin: 0 }}>
          Un enfant observe et expérimente. Lis le récit, observe le schéma, réponds aux questions et retiens les
          mots importants.
        </p>
        {PARCOURS_SCIENCES.map((c) => (
          <button key={c.cle} className="kk-btn kk-btn--block" style={{ textAlign: "left" }}
            onClick={() => void demarrer(c)}>
            {c.titre}
            <span className="kk-muted" style={{ display: "block", fontSize: "0.8rem" }}>{c.personnage}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
