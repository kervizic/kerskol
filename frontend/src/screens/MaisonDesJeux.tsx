// « Maison des jeux » : lieu de l'appli enfant (univers « à la maison »).
// Registre de jeux :
//   * « Relie les fruits » (type grille) : une partie = une grille, difficulte
//     adaptative par palier (1..5) derivee de l'historique.
//   * « Les briques » (type arcade) : une partie = 3 minutes max ou blocage, la
//     vitesse de depart s'adapte prudemment au dernier palier atteint.
// Dans les DEUX cas, une partie coute PRIX_PARTIE bonbons debites a l'ENTREE
// (jeu_jouer, atomique cote serveur). Le bouton « Rejouer » de l'ecran de fin
// des briques REPASSE par la Maison des jeux (nouveau debit), jamais gratuit.
// Chaque partie terminee est journalisee (jeu_terminer) et reste visible dans
// l'espace parent. Apres une partie : retour ici (pas d'enchainement auto).

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Home, PartyPopper } from "lucide-react";
import { Spinner, Feedback } from "../components/ui";
import { RelieLesFruits, type ResultatGrille } from "../components/RelieLesFruits";
import { JeuBriques } from "../components/JeuBriques";
import type { ResultatPartie } from "../domain/jeux/briques/moteur";
import { universDef } from "../domain/univers";
import { JEUX, grillesDuPalier, type JeuDef } from "../domain/jeux/registre";
import {
  PRIX_PARTIE,
  calculerProgression,
  choisirGrille,
  palierDef,
  type Partie,
} from "../domain/jeux/difficulte";
import {
  palierDepartBriques,
  meilleurScore,
  partiesJouees,
  type PartieBriques,
} from "../domain/jeux/briques/progression";
import type { GrilleRelie } from "../domain/jeux/relie";
import {
  getMonnaie,
  getPartiesJeu,
  getPartiesBriques,
  jouerPartieJeu,
  terminerPartieJeu,
  estSoldeInsuffisant,
} from "../lib/api";
import type { Profil } from "../lib/types";

const JEU_RELIE = "relie-les-fruits";
const JEU_BRIQUES = "les-briques";

type Mode = "accueil" | "jeu" | "fin" | "briques";

interface FinInfo {
  montee: boolean;
  descente: boolean;
  nouveauPalier: number;
}

export function MaisonDesJeux({ profil, onExit }: { profil: Profil; onExit: () => void }) {
  const [monnaie, setMonnaie] = useState<number | null>(null);
  const [parties, setParties] = useState<Partie[] | null>(null);
  const [partiesB, setPartiesB] = useState<PartieBriques[] | null>(null);
  const [mode, setMode] = useState<Mode>("accueil");
  const [grille, setGrille] = useState<GrilleRelie | null>(null);
  const [palierAvant, setPalierAvant] = useState(1);
  const [fin, setFin] = useState<FinInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  // Vitesse de depart courante des briques + compteur de partie (sert de `key`
  // pour remonter le composant a neuf a chaque nouvelle partie).
  const [briquesDepart, setBriquesDepart] = useState(0);
  const [briquesRun, setBriquesRun] = useState(0);

  const u = universDef(profil.univers);

  const charger = useCallback(async () => {
    const [m, p, pb] = await Promise.all([
      getMonnaie(profil.id).catch(() => 0),
      getPartiesJeu(profil.id, JEU_RELIE).catch(() => [] as Partie[]),
      getPartiesBriques(profil.id, JEU_BRIQUES).catch(() => [] as PartieBriques[]),
    ]);
    setMonnaie(m);
    setParties(p);
    setPartiesB(pb);
  }, [profil.id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const progression = useMemo(
    () => calculerProgression(parties ?? []),
    [parties]
  );

  // Demarre une partie : debit atomique PRIX_PARTIE, puis bascule sur le bon
  // ecran selon le type de jeu. Renvoie true si la partie a demarre.
  const jouer = useCallback(
    async (jeu: JeuDef): Promise<boolean> => {
      if (occupe || monnaie == null || parties == null || partiesB == null) return false;
      setMessage(null);
      if (monnaie < PRIX_PARTIE) {
        setMessage(`Il te faut ${PRIX_PARTIE} bonbons. Fais quelques exercices pour en gagner !`);
        return false;
      }

      // Pour un jeu de grille, on choisit la grille AVANT de debiter (evite de
      // debiter si plus aucune grille n'est disponible).
      let g: GrilleRelie | null = null;
      let palier = progression.palier;
      if (jeu.type === "grille") {
        const grilles = grillesDuPalier(palier);
        g = choisirGrille(grilles, parties, palier, Math.random());
        if (!g) {
          setMessage("Aucune grille disponible pour le moment.");
          return false;
        }
      }

      setOccupe(true);
      try {
        const res = await jouerPartieJeu(profil.id, jeu.id);
        setMonnaie(res.monnaie);
        if (jeu.type === "grille" && g) {
          setPalierAvant(palier);
          setGrille(g);
          setMode("jeu");
        } else {
          setBriquesDepart(palierDepartBriques(partiesB));
          setBriquesRun((n) => n + 1);
          setMode("briques");
        }
        return true;
      } catch (e) {
        if (estSoldeInsuffisant(e)) {
          setMessage(`Il te faut ${PRIX_PARTIE} bonbons. Fais quelques exercices pour en gagner !`);
          await charger();
          setMode("accueil");
        } else {
          setMessage("Oups, le jeu n'a pas pu démarrer. Réessaie dans un instant.");
          setMode("accueil");
        }
        return false;
      } finally {
        setOccupe(false);
      }
    },
    [occupe, monnaie, parties, partiesB, progression.palier, profil.id, charger]
  );

  // -------------------------------------------------- Relie les fruits (fin)
  const onTermine = useCallback(
    async (r: ResultatGrille) => {
      if (!grille) return;
      try {
        await terminerPartieJeu({
          profilId: profil.id,
          jeu: JEU_RELIE,
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
      const p = await getPartiesJeu(profil.id, JEU_RELIE).catch(() => parties ?? []);
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

  const abandonner = useCallback(async () => {
    if (!grille) {
      setMode("accueil");
      return;
    }
    try {
      await terminerPartieJeu({
        profilId: profil.id,
        jeu: JEU_RELIE,
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

  // ------------------------------------------------------------- Les briques
  // Fin d'une partie (blocage ou 3 min) : on journalise (score, lignes, duree,
  // palier atteint) et on recharge l'historique. AUCUN re-debit ici : le debit
  // a eu lieu a l'entree. On reste sur le jeu, qui affiche son ecran de fin.
  const briquesDef = useMemo(() => JEUX.find((j) => j.id === JEU_BRIQUES)!, []);
  const onFiniBriques = useCallback(
    async (res: ResultatPartie) => {
      try {
        await terminerPartieJeu({
          profilId: profil.id,
          jeu: JEU_BRIQUES,
          palier: res.palierAtteint,
          grilleId: "partie",
          tempsMs: res.dureeMs,
          avecIndice: false,
          abandon: false,
          reussi: true,
          score: res.score,
          lignes: res.lignes,
        });
      } catch {
        /* la fete reste bienveillante meme si l'ecriture echoue */
      }
      const pb = await getPartiesBriques(profil.id, JEU_BRIQUES).catch(() => partiesB ?? []);
      setPartiesB(pb);
    },
    [profil.id, partiesB]
  );

  // « Rejouer » depuis l'ecran de fin : REPASSE par le debit (nouvelle partie).
  const rejouerBriques = useCallback(() => {
    void jouer(briquesDef);
  }, [jouer, briquesDef]);

  const quitterBriques = useCallback(() => {
    setMode("accueil");
    void charger();
  }, [charger]);

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

  if (mode === "briques") {
    return (
      <div className="kk-page">
        <div className="kk-village__top">
          <button className="kk-icon-btn" onClick={quitterBriques} aria-label="Quitter la partie" title="Quitter">
            <ArrowLeft size={26} aria-hidden="true" />
          </button>
          {compteur}
          <span style={{ flex: 1 }} />
        </div>
        <main className="kk-container" style={{ maxWidth: 560 }}>
          <JeuBriques
            key={briquesRun}
            palierDepart={briquesDepart}
            onFini={(r) => void onFiniBriques(r)}
            onRejouer={rejouerBriques}
            onQuitter={quitterBriques}
          />
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
  const chargement = monnaie == null || parties == null || partiesB == null;
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
              {JEUX.map((jeu) => (
                <div key={jeu.id} className="kk-card kk-jeu">
                  <div className="kk-jeu__entete">
                    <span className="kk-jeu__emoji" aria-hidden="true">{jeu.emoji}</span>
                    <div>
                      <h2 style={{ margin: 0 }}>{jeu.titre}</h2>
                      <p className="kk-muted" style={{ margin: "2px 0 0" }}>{jeu.description}</p>
                    </div>
                  </div>
                  {jeu.type === "grille" ? (
                    <p className="kk-muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                      Grille du moment&nbsp;: {palierDef(progression.palier).w}×{palierDef(progression.palier).h}
                    </p>
                  ) : (
                    <p className="kk-muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                      {partiesJouees(partiesB ?? []) > 0
                        ? `Partie de 3 min · meilleur score : ${meilleurScore(partiesB ?? [])}`
                        : "Partie de 3 minutes. Fais des lignes !"}
                    </p>
                  )}
                  <button
                    className="kk-btn kk-btn--accent kk-btn--big kk-btn--block"
                    onClick={() => void jouer(jeu)}
                    disabled={occupe}
                  >
                    Jouer — {PRIX_PARTIE} {u.monnaie}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
