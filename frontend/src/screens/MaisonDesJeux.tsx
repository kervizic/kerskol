// « Maison des jeux » : nouveau lieu de l'appli enfant (univers « à la maison »).
// Registre de jeux (un seul pour l'instant : « Relie les fruits »). Solde de
// bonbons visible ; une partie = une grille = PRIX_PARTIE bonbons (debit serveur
// atomique). Difficulte adaptative derivee de l'historique (cote serveur, via
// jeu_parties). Apres chaque grille : retour ici (pas d'enchainement auto).

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Home, PartyPopper } from "lucide-react";
import { Spinner, Feedback } from "../components/ui";
import { RelieLesFruits, type ResultatGrille } from "../components/RelieLesFruits";
import { universDef } from "../domain/univers";
import { JEUX, grillesDuPalier } from "../domain/jeux/registre";
import {
  PRIX_PARTIE,
  calculerProgression,
  choisirGrille,
  palierDef,
  type Partie,
} from "../domain/jeux/difficulte";
import type { GrilleRelie } from "../domain/jeux/relie";
import { getMonnaie, getPartiesJeu, jouerPartieJeu, terminerPartieJeu, estSoldeInsuffisant } from "../lib/api";
import type { Profil } from "../lib/types";

const JEU_ID = "relie-les-fruits";

type Mode = "accueil" | "jeu" | "fin";

interface FinInfo {
  montee: boolean;
  descente: boolean;
  nouveauPalier: number;
}

export function MaisonDesJeux({ profil, onExit }: { profil: Profil; onExit: () => void }) {
  const [monnaie, setMonnaie] = useState<number | null>(null);
  const [parties, setParties] = useState<Partie[] | null>(null);
  const [mode, setMode] = useState<Mode>("accueil");
  const [grille, setGrille] = useState<GrilleRelie | null>(null);
  const [palierAvant, setPalierAvant] = useState(1);
  const [fin, setFin] = useState<FinInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const u = universDef(profil.univers);

  const charger = useCallback(async () => {
    const [m, p] = await Promise.all([
      getMonnaie(profil.id).catch(() => 0),
      getPartiesJeu(profil.id, JEU_ID).catch(() => [] as Partie[]),
    ]);
    setMonnaie(m);
    setParties(p);
  }, [profil.id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const progression = useMemo(
    () => calculerProgression(parties ?? []),
    [parties]
  );

  const jouer = useCallback(async () => {
    if (occupe || monnaie == null || parties == null) return;
    setMessage(null);
    if (monnaie < PRIX_PARTIE) {
      setMessage(`Il te faut ${PRIX_PARTIE} bonbons. Fais quelques exercices pour en gagner !`);
      return;
    }
    const palier = progression.palier;
    const grilles = grillesDuPalier(palier);
    const g = choisirGrille(grilles, parties, palier, Math.random());
    if (!g) {
      setMessage("Aucune grille disponible pour le moment.");
      return;
    }
    setOccupe(true);
    try {
      const res = await jouerPartieJeu(profil.id, JEU_ID);
      setMonnaie(res.monnaie);
      setPalierAvant(palier);
      setGrille(g);
      setMode("jeu");
    } catch (e) {
      if (estSoldeInsuffisant(e)) {
        setMessage(`Il te faut ${PRIX_PARTIE} bonbons. Fais quelques exercices pour en gagner !`);
        await charger();
      } else {
        setMessage("Oups, le jeu n'a pas pu démarrer. Réessaie dans un instant.");
      }
    } finally {
      setOccupe(false);
    }
  }, [occupe, monnaie, parties, progression.palier, profil.id, charger]);

  // Fin d'une grille (victoire). On journalise, on recharge l'historique, on
  // calcule le changement de palier eventuel (fete) et on affiche l'ecran de fin.
  const onTermine = useCallback(
    async (r: ResultatGrille) => {
      if (!grille) return;
      try {
        await terminerPartieJeu({
          profilId: profil.id,
          jeu: JEU_ID,
          palier: grille.palier,
          grilleId: grille.id,
          tempsMs: r.tempsMs,
          avecIndice: r.avecIndice,
          abandon: false,
          reussi: true,
        });
      } catch {
        /* on continue : la fete reste bienveillante meme si l'ecriture echoue */
      }
      const p = await getPartiesJeu(profil.id, JEU_ID).catch(() => parties ?? []);
      setParties(p);
      const nouveau = calculerProgression(p).palier;
      setFin({
        montee: nouveau > palierAvant,
        descente: nouveau < palierAvant,
        nouveauPalier: nouveau,
      });
      setMode("fin");
      setGrille(null);
    },
    [grille, profil.id, palierAvant, parties]
  );

  // Abandon : l'enfant arrete une grille en cours (sans culpabilisation).
  const abandonner = useCallback(async () => {
    if (!grille) {
      setMode("accueil");
      return;
    }
    try {
      await terminerPartieJeu({
        profilId: profil.id,
        jeu: JEU_ID,
        palier: grille.palier,
        grilleId: grille.id,
        tempsMs: 0,
        avecIndice: false,
        abandon: true,
        reussi: false,
      });
    } catch {
      /* ignore */
    }
    await charger();
    setGrille(null);
    setMode("accueil");
  }, [grille, profil.id, charger]);

  const retourAccueil = useCallback(() => {
    setFin(null);
    setMode("accueil");
  }, []);

  // ---------------------------------------------------------------- rendu
  const compteur = (
    <span className="kk-money" title={`${monnaie ?? 0} ${u.monnaie}`}>
      <u.MonnaieIcon size={22} />
      {monnaie ?? 0}
    </span>
  );

  if (mode === "jeu" && grille) {
    return (
      <div className="kk-page">
        <div className="kk-village__top">
          <button className="kk-icon-btn" onClick={() => void abandonner()} aria-label="Quitter la partie" title="Quitter">
            <ArrowLeft size={26} aria-hidden="true" />
          </button>
          {compteur}
          <span style={{ flex: 1 }} />
        </div>
        <main className="kk-container" style={{ maxWidth: 480 }}>
          <RelieLesFruits grille={grille} profil={profil} onTermine={(r) => void onTermine(r)} />
        </main>
      </div>
    );
  }

  if (mode === "fin" && fin) {
    const def = palierDef(fin.nouveauPalier);
    return (
      <div className="kk-page kk-center">
        <div className="kk-container" style={{ maxWidth: 440, textAlign: "center" }}>
          <div style={{ fontSize: "3rem" }} aria-hidden="true">🎉</div>
          <h1>Bravo&nbsp;!</h1>
          <p className="kk-lead">Tu as relié tous les fruits.</p>
          {fin.montee && (
            <Feedback kind="success">
              <PartyPopper size={18} aria-hidden="true" /> Tu passes à une grille plus grande&nbsp;!
            </Feedback>
          )}
          {fin.descente && (
            <Feedback kind="info">On continue avec une grille plus petite, à ton rythme.</Feedback>
          )}
          <p className="kk-muted">{compteur} {u.monnaie} en poche.</p>
          <button className="kk-btn kk-btn--accent kk-btn--big kk-btn--block" onClick={retourAccueil}>
            <Home size={20} aria-hidden="true" /> Retour à la Maison des jeux
          </button>
          <p className="kk-muted" style={{ fontSize: "0.85rem" }}>
            Prochaine grille&nbsp;: {def.w}×{def.h}.
          </p>
        </div>
      </div>
    );
  }

  // accueil
  const chargement = monnaie == null || parties == null;
  return (
    <div className="kk-page">
      <div className="kk-village__top">
        <button className="kk-icon-btn" onClick={onExit} aria-label="Retour au village" title="Retour au village">
          <ArrowLeft size={26} aria-hidden="true" />
        </button>
        {compteur}
        <span style={{ flex: 1 }} />
      </div>

      <main className="kk-village__main">
        <h1>La Maison des jeux</h1>
        {chargement ? (
          <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
            <Spinner />
          </div>
        ) : (
          <>
            {message && (
              <Feedback kind="info">{message}</Feedback>
            )}
            <div className="kk-jeux">
              {JEUX.map((jeu) => {
                const def = palierDef(progression.palier);
                return (
                  <div key={jeu.id} className="kk-card kk-jeu">
                    <div className="kk-jeu__entete">
                      <span className="kk-jeu__emoji" aria-hidden="true">{jeu.emoji}</span>
                      <div>
                        <h2 style={{ margin: 0 }}>{jeu.titre}</h2>
                        <p className="kk-muted" style={{ margin: "2px 0 0" }}>{jeu.description}</p>
                      </div>
                    </div>
                    <p className="kk-muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                      Grille du moment&nbsp;: {def.w}×{def.h}
                    </p>
                    <button
                      className="kk-btn kk-btn--accent kk-btn--big kk-btn--block"
                      onClick={() => void jouer()}
                      disabled={occupe}
                    >
                      Jouer — {PRIX_PARTIE} {u.monnaie}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
