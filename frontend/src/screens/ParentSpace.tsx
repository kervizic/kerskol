import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { AvatarView } from "../domain/avatars";
import { Feedback, Spinner } from "../components/ui";
import {
  annulerLienEnfant,
  ConfirmationRequiseError,
  delierCompteEnfant,
  deleteFoyer,
  demanderLienEnfant,
  getDefiResume,
  getEcritureProductions,
  getJournal,
  listLiensEnAttente,
  reauthGoogle,
  ReauthRequiseError,
  reglerAutorisationMatieres,
  reglerMatieres,
  updateProfil,
  listerMaitresse,
  upsertMaitresse,
  activerMaitresse,
  supprimerMaitresse,
  getHistoriqueMaitresse,
  type DefiResume,
  type EcritureProduction,
  type MaitresseListeParent,
  type HistoriqueDictee,
} from "../lib/api";
import { DEFI_THEMES } from "../domain/calcul/defi";
import DicteeMaitresse from "../components/DicteeMaitresse";
import { MatieresEditor } from "../components/MatieresEditor";
import { TOUS_DOMAINES } from "../domain/matieres";
import { messageClasse } from "./CreateProfile";

function defiThemeLabel(id: string): string {
  return DEFI_THEMES.find((t) => t.id === id)?.label ?? id;
}

// Resume des defis d'un enfant (vue parent) : rien de public, juste records et
// nombre de defis par theme. Comparaison au seul record personnel.
function DefiSummary({ profilId }: { profilId: string }) {
  const [resume, setResume] = useState<DefiResume[] | null>(null);
  useEffect(() => {
    let alive = true;
    getDefiResume(profilId)
      .then((r) => alive && setResume(r))
      .catch(() => alive && setResume([]));
    return () => {
      alive = false;
    };
  }, [profilId]);
  if (resume === null) return null;
  if (resume.length === 0) {
    return <p className="kk-muted" style={{ margin: 0 }}>Défi chrono : aucun défi joué pour l’instant.</p>;
  }
  return (
    <div>
      <h3 style={{ margin: "0 0 6px" }}>Défi chrono</h3>
      <ul className="kk-list" style={{ margin: 0 }}>
        {resume.map((r) => (
          <li key={r.theme} style={{ padding: "6px 0", border: "none" }}>
            <strong>{defiThemeLabel(r.theme)}</strong> — record {r.record} ·{" "}
            {r.nb} défi{r.nb > 1 ? "s" : ""} joué{r.nb > 1 ? "s" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
import {
  CLASSES,
  type Classe,
  type JournalReglage,
  type LienEnAttente,
  type Profil,
} from "../lib/types";

const RETRY_KEY = "kerskol_retry_suppr_foyer";
const SUPPR_WORD_KEY = "kerskol_suppr_foyer_mot";
const SUPPR_WORD = "SUPPRIMER";
const MATIERE_ACTIVE = "MA";

// Phrases écrites par l'enfant (N4 de « Copier et écrire »), relues par le
// parent. Lecture seule ; rien n'est jugé ici, c'est pour accompagner l'enfant.
function EcritureSummary({ profilId }: { profilId: string }) {
  const [prods, setProds] = useState<EcritureProduction[] | null>(null);
  useEffect(() => {
    let alive = true;
    getEcritureProductions(profilId)
      .then((r) => alive && setProds(r))
      .catch(() => alive && setProds([]));
    return () => {
      alive = false;
    };
  }, [profilId]);
  if (prods === null || prods.length === 0) return null;
  return (
    <div>
      <h3 style={{ margin: "0 0 6px" }}>Phrases écrites</h3>
      <ul className="kk-list" style={{ margin: 0 }}>
        {prods.map((p, i) => (
          <li key={i} style={{ padding: "6px 0", border: "none" }}>
            « {p.texte} »
          </li>
        ))}
      </ul>
    </div>
  );
}

function num(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function journalLabel(cle: string): string {
  switch (cle) {
    case "limite_jour_min":
      return "Limite par jour (min)";
    case "limite_semaine_min":
      return "Limite par semaine (min)";
    case "matieres_actives":
      return "Matières actives";
    case "lecture_auto":
      return "Lecture à voix haute";
    case "mails_actives":
      return "Mails de suivi";
    case "compte_enfant":
      return "Compte Google de l’enfant";
    default:
      return cle;
  }
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function ProfilEditor({
  profil,
  onSaved,
}: {
  profil: Profil;
  onSaved: (p: Profil) => void;
}) {
  const [classe, setClasse] = useState<Classe>(profil.classe);
  const [jourOn, setJourOn] = useState(profil.limite_jour_min != null);
  const [jour, setJour] = useState(profil.limite_jour_min?.toString() ?? "20");
  const [semaineOn, setSemaineOn] = useState(profil.limite_semaine_min != null);
  const [semaine, setSemaine] = useState(profil.limite_semaine_min?.toString() ?? "90");
  // Matieres + sous-matieres : persistees A PART (RPC regler_matieres), hors du
  // bouton « Enregistrer » (qui ne gere que classe / limites / voix).
  const [mat, setMat] = useState<string[]>(profil.matieres_actives ?? [MATIERE_ACTIVE]);
  const [dom, setDom] = useState<string[]>(profil.domaines_actifs ?? TOUS_DOMAINES);
  const [autorise, setAutorise] = useState(profil.enfant_regle_matieres !== false);
  const [matErr, setMatErr] = useState(false);
  // Lecture auto a voix haute (defaut actif si le champ est absent).
  const [lectureAuto, setLectureAuto] = useState(profil.lecture_auto !== false);
  const [state, setState] = useState<"idle" | "saving" | "ok" | "err">("idle");

  async function changeMatieres(matieres: string[], domaines: string[]) {
    const pMat = mat, pDom = dom;
    setMat(matieres); setDom(domaines); setMatErr(false);
    try {
      await reglerMatieres(profil.id, matieres, domaines);
      onSaved({ ...profil, matieres_actives: matieres, domaines_actifs: domaines });
    } catch (e) {
      console.error("reglerMatieres a echoue", e);
      setMat(pMat); setDom(pDom); setMatErr(true);
    }
  }
  async function changeAutorisation(next: boolean) {
    const prev = autorise;
    setAutorise(next);
    try {
      await reglerAutorisationMatieres(profil.id, next);
      onSaved({ ...profil, enfant_regle_matieres: next });
    } catch (e) {
      console.error("reglerAutorisationMatieres a echoue", e);
      setAutorise(prev);
    }
  }

  // Valeur effective : null si l'interrupteur est off (retrait de la limite).
  const nextJour = jourOn ? num(jour) : null;
  const nextSemaine = semaineOn ? num(semaine) : null;
  const dirty =
    classe !== profil.classe ||
    nextJour !== profil.limite_jour_min ||
    nextSemaine !== profil.limite_semaine_min ||
    lectureAuto !== (profil.lecture_auto !== false);

  async function save() {
    setState("saving");
    try {
      // null <-> valeur et changement de classe : journalises par le trigger.
      const patch = {
        classe, limite_jour_min: nextJour, limite_semaine_min: nextSemaine,
        lecture_auto: lectureAuto,
      };
      await updateProfil(profil.id, patch);
      onSaved({ ...profil, ...patch });
      setState("ok");
    } catch (e) {
      console.error("updateProfil a echoue", e);
      setState("err");
    }
  }

  return (
    <div className="kk-stack">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <AvatarView avatar={profil.avatar} size={48} />
        <h2 style={{ margin: 0 }}>{profil.surnom}</h2>
      </div>

      <div className="kk-field">
        <span>Matières et sous-matières</span>
        <p className="kk-muted" style={{ fontSize: "0.85rem", margin: "0 0 4px" }}>
          Active ou désactive ce que {profil.surnom} travaille. Au moins une sous-matière doit rester active.
        </p>
        <MatieresEditor matieresActives={mat} domainesActifs={dom} onChange={changeMatieres} />
        {matErr && (
          <p className="kk-muted" role="alert">Échec de l’enregistrement des matières. Réessaie.</p>
        )}
        <label className="kk-switch-row" style={{ marginTop: 14 }}>
          <input
            type="checkbox"
            checked={autorise}
            onChange={(e) => void changeAutorisation(e.target.checked)}
          />
          <span>Laisser {profil.surnom} choisir ses matières</span>
        </label>
        <p className="kk-muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>
          {autorise
            ? `${profil.surnom} peut régler ses matières depuis son écran. Vos réglages partagent le même profil.`
            : `La section « Mes matières » est masquée chez ${profil.surnom} : seuls vos réglages comptent.`}
        </p>
      </div>

      <label className="kk-field">
        <span>Classe</span>
        <select className="kk-select" value={classe} onChange={(e) => setClasse(e.target.value as Classe)}>
          {CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {messageClasse(classe) && (
          <p className="kk-muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>{messageClasse(classe)}</p>
        )}
      </label>

      <div className="kk-field">
        <span>Temps d’écran</span>
        <label className="kk-switch-row">
          <input type="checkbox" checked={jourOn} onChange={(e) => setJourOn(e.target.checked)} />
          <span>Limiter le temps par jour</span>
        </label>
        {jourOn && (
          <input className="kk-input" type="number" min={1} inputMode="numeric" value={jour}
            onChange={(e) => setJour(e.target.value)} aria-label="Minutes par jour"
            placeholder="minutes par jour" style={{ marginTop: 8 }} />
        )}
        <label className="kk-switch-row" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={semaineOn} onChange={(e) => setSemaineOn(e.target.checked)} />
          <span>Limiter le temps par semaine</span>
        </label>
        {semaineOn && (
          <input className="kk-input" type="number" min={1} inputMode="numeric" value={semaine}
            onChange={(e) => setSemaine(e.target.value)} aria-label="Minutes par semaine"
            placeholder="minutes par semaine" style={{ marginTop: 8 }} />
        )}
      </div>

      <div className="kk-field">
        <span>Voix</span>
        <label className="kk-switch-row">
          <input type="checkbox" checked={lectureAuto} onChange={(e) => setLectureAuto(e.target.checked)} />
          <span>Lire les consignes et dictées à voix haute</span>
        </label>
        <p className="kk-muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>
          Le bouton haut-parleur reste disponible même si la lecture automatique est désactivée.
        </p>
      </div>

      {state === "ok" && <Feedback kind="success">Réglages enregistrés. Le changement est journalisé.</Feedback>}
      {state === "err" && <Feedback kind="error">Échec de l’enregistrement. Réessaie.</Feedback>}

      <button className="kk-btn kk-btn--accent" disabled={!dirty || state === "saving"} onClick={() => void save()}>
        {state === "saving" ? "..." : "Enregistrer"}
      </button>
    </div>
  );
}

// Rattachement du compte Google de l'enfant a son profil (etat + actions).
function LinkAccount({
  profil,
  lien,
  onProfilChange,
  onReload,
}: {
  profil: Profil;
  lien: LienEnAttente | undefined;
  onProfilChange: (p: Profil) => void;
  onReload: () => Promise<void>;
}) {
  const relie = profil.user_id != null;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function relier() {
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    setMsg(null);
    try {
      const nouveauCode = await demanderLienEnfant(profil.id, value);
      setEmail("");
      setCode(nouveauCode);
      setMsg(null);
      await onReload();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Une erreur est survenue." });
    } finally {
      setBusy(false);
    }
  }

  async function annuler() {
    if (!lien) return;
    setBusy(true);
    setMsg(null);
    setCode(null);
    try {
      await annulerLienEnfant(lien.id);
      await onReload();
    } catch {
      setMsg({ kind: "error", text: "L’annulation a échoué. Réessaie." });
    } finally {
      setBusy(false);
    }
  }

  async function delier() {
    setBusy(true);
    setMsg(null);
    try {
      await delierCompteEnfant(profil.id);
      onProfilChange({ ...profil, user_id: null });
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Le déliement a échoué." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kk-field" style={{ marginTop: 4 }}>
      <span>Compte Google de l’enfant</span>
      {relie ? (
        <div className="kk-row" style={{ alignItems: "center", gap: 12 }}>
          <span className="kk-muted">✅ Compte relié : l’enfant se connecte avec son propre compte.</span>
          <button className="kk-btn kk-btn--ghost" disabled={busy} onClick={() => void delier()}>
            {busy ? "..." : "Délier"}
          </button>
        </div>
      ) : lien ? (
        <div className="kk-row" style={{ alignItems: "center", gap: 12 }}>
          <span className="kk-muted">
            ⏳ En attente : <strong>{lien.email}</strong> · expire le{" "}
            {new Date(lien.expire_le).toLocaleDateString("fr-FR")}
          </span>
          <button className="kk-btn kk-btn--ghost" disabled={busy} onClick={() => void annuler()}>
            {busy ? "..." : "Annuler"}
          </button>
        </div>
      ) : (
        <div className="kk-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input
            className="kk-input"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="adresse Google de l’enfant"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label={`Adresse Google pour ${profil.surnom}`}
            style={{ flex: 1, minWidth: 200 }}
          />
          <button className="kk-btn kk-btn--accent" disabled={busy || !email.trim()} onClick={() => void relier()}>
            {busy ? "..." : "Relier un compte Google"}
          </button>
        </div>
      )}
      {code && (
        <Feedback kind="success">
          Lien créé. Donne ce code à l’enfant pour qu’il relie son compte à sa
          prochaine connexion (valable 7 jours)&nbsp;:
          <span
            style={{
              display: "block",
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "0.4rem",
              marginTop: 8,
            }}
          >
            {code}
          </span>
        </Feedback>
      )}
      {msg && <Feedback kind={msg.kind}>{msg.text}</Feedback>}
    </div>
  );
}

// --------------------------------------------------------------------------
// « Les mots de la maitresse » (phase 6). Le PARENT saisit des listes de mots a
// apprendre et/ou des textes de dictee donnes par la maitresse ; elles
// deviennent des exercices pour l'enfant. CRUD + activation + apercu. Les
// garde-fous sont verifies cote serveur (migration 0046) ; on en affiche un
// rappel clair et on remonte les erreurs serveur telles quelles.
const MAITRESSE_MAX_ACTIVES = 10;

function parseMots(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
}

function MaitresseManager({ foyerId }: { foyerId: string }) {
  const [listes, setListes] = useState<MaitresseListeParent[] | null>(null);
  const [edition, setEdition] = useState<string | "new" | null>(null); // id en cours, "new", ou null
  const [titre, setTitre] = useState("");
  const [motsRaw, setMotsRaw] = useState("");
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(() => {
    listerMaitresse(foyerId).then(setListes).catch(() => setListes([]));
  }, [foyerId]);
  useEffect(() => { reload(); }, [reload]);

  const mots = parseMots(motsRaw);
  const nbActives = (listes ?? []).filter((l) => l.active).length;

  // Validation cliente (rappel ; le serveur reste la source de verite).
  function valider(): string | null {
    const t = titre.trim();
    if (t.length < 1 || t.length > 60) return "Le titre doit faire entre 1 et 60 caractères.";
    if (/[<>]/.test(t) || /[<>]/.test(texte)) return "Les caractères < et > ne sont pas autorisés.";
    if (mots.length > 0 && mots.length < 3) return "Mets au moins 3 mots (ou laisse vide et mets un texte).";
    if (mots.length > 20) return "Au plus 20 mots par liste.";
    if (mots.some((m) => m.length > 30)) return "Un mot est trop long (30 lettres maximum).";
    if (mots.some((m) => /[<>]/.test(m))) return "Les caractères < et > ne sont pas autorisés.";
    if (texte.length > 600) return "Le texte est trop long (600 caractères maximum).";
    if (mots.length < 3 && texte.trim() === "") return "Mets au moins 3 mots ou un texte de dictée.";
    return null;
  }

  function startNew() {
    setEdition("new"); setTitre(""); setMotsRaw(""); setTexte(""); setErr(null);
  }
  function startEdit(l: MaitresseListeParent) {
    setEdition(l.id); setTitre(l.titre); setMotsRaw(l.mots.join(" ")); setTexte(l.texte ?? ""); setErr(null);
  }
  function cancel() { setEdition(null); setErr(null); }

  async function save() {
    const probleme = valider();
    if (probleme) { setErr(probleme); return; }
    setBusy(true); setErr(null);
    try {
      await upsertMaitresse(
        edition === "new" ? null : edition,
        foyerId, titre.trim(), mots, texte.trim() === "" ? null : texte.trim(),
      );
      setEdition(null);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "L'enregistrement a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(l: MaitresseListeParent) {
    if (!l.active && nbActives >= MAITRESSE_MAX_ACTIVES) {
      setErr(`Au plus ${MAITRESSE_MAX_ACTIVES} listes actives à la fois.`);
      return;
    }
    try { await activerMaitresse(l.id, !l.active); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Le changement a échoué."); }
  }

  async function remove(l: MaitresseListeParent) {
    if (!confirm(`Supprimer la liste « ${l.titre} » ?`)) return;
    try { await supprimerMaitresse(l.id); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : "La suppression a échoué."); }
  }

  return (
    <div className="kk-card kk-stack" style={{ marginTop: 24 }}>
      <h2>Les mots de la maîtresse</h2>
      <p className="kk-muted" style={{ margin: 0 }}>
        Ajoute les listes de mots à apprendre et les textes de dictée donnés par la
        maîtresse. Ils deviennent des exercices pour l'enfant quand la liste est
        active. Au moins 3 mots, ou un texte. Au plus {MAITRESSE_MAX_ACTIVES} listes actives.
      </p>

      {listes === null ? (
        <Spinner />
      ) : listes.length === 0 ? (
        <p className="kk-muted">Aucune liste pour l'instant.</p>
      ) : (
        <ul className="kk-list">
          {listes.map((l) => (
            <li key={l.id} style={{ padding: "8px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <strong>{l.titre}</strong>{" "}
                  <span className="kk-muted">
                    {l.mots.length > 0 ? `${l.mots.length} mot${l.mots.length > 1 ? "s" : ""}` : ""}
                    {l.mots.length > 0 && l.texte ? " · " : ""}
                    {l.texte ? "texte de dictée" : ""}
                  </span>
                </div>
                <div className="kk-row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <label className="kk-switch-row" style={{ margin: 0 }}>
                    <input type="checkbox" checked={l.active} onChange={() => void toggle(l)} />
                    <span>{l.active ? "Active" : "Inactive"}</span>
                  </label>
                  <button className="kk-btn kk-btn--ghost" onClick={() => startEdit(l)}>Modifier</button>
                  <button className="kk-btn kk-btn--ghost" onClick={() => void remove(l)}>Supprimer</button>
                </div>
              </div>
              {/* Apercu : mots et debut du texte. */}
              {(l.mots.length > 0 || l.texte) && (
                <p className="kk-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                  {l.mots.length > 0 && <>Mots : {l.mots.join(", ")}. </>}
                  {l.texte && <>Texte : {l.texte.length > 120 ? l.texte.slice(0, 120) + "…" : l.texte}</>}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {edition === null ? (
        <button className="kk-btn kk-btn--accent" onClick={startNew}>+ Ajouter une liste</button>
      ) : (
        <div className="kk-stack" style={{ borderTop: "1px solid var(--kk-border, #ddd)", paddingTop: 12 }}>
          <h3 style={{ margin: 0 }}>{edition === "new" ? "Nouvelle liste" : "Modifier la liste"}</h3>
          <label className="kk-field">
            <span>Titre</span>
            <input className="kk-input" value={titre} maxLength={60} onChange={(e) => setTitre(e.target.value)}
              placeholder="Mots de la semaine" />
          </label>
          <label className="kk-field">
            <span>Mots à apprendre (séparés par des espaces ou des virgules)</span>
            <textarea className="kk-input" rows={3} value={motsRaw} onChange={(e) => setMotsRaw(e.target.value)}
              placeholder="maison toujours jardin beaucoup poisson" spellCheck={false} />
            <span className="kk-muted" style={{ fontSize: "0.8rem" }}>{mots.length} mot{mots.length > 1 ? "s" : ""}</span>
          </label>
          <label className="kk-field">
            <span>Texte de dictée (optionnel)</span>
            <textarea className="kk-input" rows={4} value={texte} maxLength={600} onChange={(e) => setTexte(e.target.value)}
              placeholder="Le chat de la maison dort toujours dans le jardin." spellCheck={false} />
            <span className="kk-muted" style={{ fontSize: "0.8rem" }}>{texte.length} / 600</span>
          </label>

          {/* Apercu avant activation. */}
          {(mots.length > 0 || texte.trim() !== "") && (
            <div className="kk-support" style={{ padding: 10 }}>
              <strong>Aperçu</strong>
              {mots.length > 0 && <p style={{ margin: "4px 0" }}>Mots : {mots.join(", ")}.</p>}
              {texte.trim() !== "" && <p style={{ margin: "4px 0" }}>Texte : {texte.trim()}</p>}
            </div>
          )}

          {err && <Feedback kind="error">{err}</Feedback>}
          <div className="kk-row" style={{ gap: 8 }}>
            <button className="kk-btn kk-btn--accent" disabled={busy} onClick={() => void save()}>
              {busy ? "..." : "Enregistrer"}
            </button>
            <button className="kk-btn kk-btn--ghost" disabled={busy} onClick={cancel}>Annuler</button>
          </div>
          <p className="kk-muted" style={{ fontSize: "0.8rem", margin: 0 }}>
            La liste est créée inactive : vérifie l'aperçu, puis active-la pour qu'elle apparaisse dans les exercices.
          </p>
        </div>
      )}
      {edition === null && err && <Feedback kind="error">{err}</Feedback>}
    </div>
  );
}

// « Dictée avec papa ou maman » (espace parent). Le parent choisit un enfant,
// lance une dictée (il lit, l'enfant écrit sur l'écran ou sur le cahier) et
// consulte l'historique (date, score, mots ratés). Le composant <DicteeMaitresse>
// est partagé avec l'écran enfant.
function MaitresseDicteeParent({ profils }: { profils: Profil[] }) {
  const [profilId, setProfilId] = useState(profils[0]?.id ?? "");
  const [enCours, setEnCours] = useState(false);
  const [hist, setHist] = useState<HistoriqueDictee[] | null>(null);

  const reload = useCallback(() => {
    if (!profilId) { setHist([]); return; }
    getHistoriqueMaitresse(profilId).then(setHist).catch(() => setHist([]));
  }, [profilId]);
  useEffect(() => { reload(); }, [reload]);

  const profil = profils.find((p) => p.id === profilId) ?? null;

  if (enCours && profil) {
    return <DicteeMaitresse profil={profil} onExit={() => { setEnCours(false); reload(); }} />;
  }

  return (
    <div className="kk-card kk-stack" style={{ marginTop: 24 }}>
      <h2>Dictée avec papa ou maman</h2>
      <p className="kk-muted" style={{ margin: 0 }}>
        Lis les mots d'une liste active à voix haute : l'enfant les écrit sur l'écran, ou
        sur son cahier (tu coches juste / à revoir). À la fin, la correction est automatique
        et les mots ratés reviennent en priorité.
      </p>

      {profils.length > 1 && (
        <label className="kk-field">
          <span>Pour quel enfant ?</span>
          <select className="kk-input" value={profilId} onChange={(e) => setProfilId(e.target.value)}>
            {profils.map((p) => <option key={p.id} value={p.id}>{p.surnom}</option>)}
          </select>
        </label>
      )}

      <button className="kk-btn kk-btn--accent" disabled={!profil} onClick={() => setEnCours(true)}>
        Lancer une dictée
      </button>

      <h3 style={{ margin: "8px 0 0" }}>Historique des dictées</h3>
      {hist === null ? (
        <Spinner />
      ) : hist.length === 0 ? (
        <p className="kk-muted" style={{ margin: 0 }}>Aucune dictée pour l'instant.</p>
      ) : (
        <ul className="kk-list">
          {hist.map((h) => (
            <li key={h.id} style={{ padding: "8px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong>
                  {new Date(h.cree_le).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  {" · "}{h.mode === "voix" ? "sur l'écran" : "sur papier"}
                </strong>
                <span className="kk-muted">{h.score_juste} / {h.score_total}{" "}
                  — <em>{h.titre}</em>
                </span>
              </div>
              {h.rates.length > 0 && (
                <p className="kk-muted" style={{ margin: "2px 0 0", fontSize: "0.85rem" }}>
                  Mots ratés : {h.rates.join(", ")}.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ParentSpace({
  foyerId,
  profils,
  onProfilChange,
  onAddChild,
  onExit,
  onBiblio,
  onFoyerDeleted,
}: {
  foyerId: string;
  profils: Profil[];
  onProfilChange: (p: Profil) => void;
  onAddChild: () => void;
  onExit: () => void;
  onBiblio: () => void;
  onFoyerDeleted: () => void;
}) {
  const [journal, setJournal] = useState<JournalReglage[] | null>(null);
  const [liens, setLiens] = useState<LienEnAttente[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [reauthNeeded, setReauthNeeded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [motSuppr, setMotSuppr] = useState("");

  const reloadLiens = useCallback(
    () =>
      listLiensEnAttente(foyerId)
        .then(setLiens)
        .catch(() => setLiens([])),
    [foyerId]
  );

  useEffect(() => {
    getJournal(foyerId)
      .then(setJournal)
      .catch(() => setJournal([]));
    void reloadLiens();
  }, [foyerId, reloadLiens]);

  // Reprise apres reconnexion Google (le flux supprimer_foyer avait exige une
  // reauthentification recente) : on retente automatiquement une fois.
  useEffect(() => {
    let flag = false;
    try {
      flag = sessionStorage.getItem(RETRY_KEY) === foyerId;
    } catch {
      /* ignore */
    }
    if (flag) {
      let mot = "";
      try {
        sessionStorage.removeItem(RETRY_KEY);
        mot = sessionStorage.getItem(SUPPR_WORD_KEY) ?? "";
        sessionStorage.removeItem(SUPPR_WORD_KEY);
      } catch {
        /* ignore */
      }
      // On revient de Google : on avait deja confirme le mot « SUPPRIMER ».
      setConfirming(true);
      setMotSuppr(mot);
      void runDelete(mot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foyerId]);

  async function runDelete(mot: string = motSuppr) {
    setDeleting(true);
    setReauthNeeded(false);
    try {
      await deleteFoyer(foyerId, mot);
      onFoyerDeleted();
    } catch (e) {
      setDeleting(false);
      if (e instanceof ReauthRequiseError) {
        setReauthNeeded(true);
      } else if (e instanceof ConfirmationRequiseError) {
        alert(`Tape le mot ${SUPPR_WORD} pour confirmer la suppression.`);
      } else {
        console.error("supprimer_foyer a echoue", e);
        alert("La suppression a échoué. Réessaie plus tard.");
      }
    }
  }

  async function reauthThenDelete() {
    try {
      sessionStorage.setItem(RETRY_KEY, foyerId);
      sessionStorage.setItem(SUPPR_WORD_KEY, motSuppr);
    } catch {
      /* ignore */
    }
    await reauthGoogle(); // redirige vers Google ; au retour, retry automatique
  }

  const profilName = (id: string | null) =>
    id ? profils.find((p) => p.id === id)?.surnom ?? "profil" : "foyer";

  return (
    <div className="kk-page">
      <div className="kk-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h1>Espace parent</h1>
          <button className="kk-link" onClick={onExit} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowLeft size={18} aria-hidden="true" /> Qui joue ?</button>
        </div>

        {profils.map((p) => (
          <div key={p.id} className="kk-card kk-stack" style={{ marginBottom: 16 }}>
            <ProfilEditor profil={p} onSaved={onProfilChange} />
            <LinkAccount
              profil={p}
              lien={liens.find((l) => l.profil_id === p.id)}
              onProfilChange={onProfilChange}
              onReload={reloadLiens}
            />
            <DefiSummary profilId={p.id} />
            <EcritureSummary profilId={p.id} />
          </div>
        ))}

        <button className="kk-btn kk-btn--block" onClick={onBiblio} style={{ marginBottom: 16 }}>
          <BookOpen size={18} aria-hidden="true" /> Bibliothèque
        </button>

        <button className="kk-btn kk-btn--accent kk-btn--block" onClick={onAddChild}>
          + Ajouter un enfant
        </button>

        <MaitresseManager foyerId={foyerId} />

        {profils.length > 0 && <MaitresseDicteeParent profils={profils} />}

        <div className="kk-card kk-stack" style={{ marginTop: 24 }}>
          <h2>Journal des réglages</h2>
          {journal === null ? (
            <Spinner />
          ) : journal.length === 0 ? (
            <p className="kk-muted">Aucun changement de réglage pour l’instant.</p>
          ) : (
            <ul className="kk-list">
              {journal.map((j) => (
                <li key={j.id}>
                  <strong>{journalLabel(j.cle)}</strong> — {profilName(j.profil_id)}
                  <br />
                  <span className="kk-muted">
                    {fmt(j.ancienne)} → {fmt(j.nouvelle)} · {new Date(j.cree_le).toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="kk-card kk-stack" style={{ marginTop: 24 }}>
          <h2>Zone sensible</h2>
          <p className="kk-muted">
            La suppression du foyer efface définitivement tous les profils, leur
            progression et leur monnaie. Action irréversible.
          </p>
          {reauthNeeded && (
            <Feedback kind="error">
              Pour ta sécurité, reconnecte-toi pour confirmer la suppression.
            </Feedback>
          )}
          {!confirming ? (
            <button className="kk-btn kk-btn--danger" onClick={() => setConfirming(true)}>
              Supprimer le foyer
            </button>
          ) : (
            <div className="kk-stack">
              <label className="kk-field">
                <span>
                  Pour confirmer, tape le mot <strong>{SUPPR_WORD}</strong>
                </span>
                <input
                  className="kk-input"
                  value={motSuppr}
                  disabled={deleting}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={`Taper ${SUPPR_WORD} pour confirmer`}
                  onChange={(e) => setMotSuppr(e.target.value)}
                />
              </label>
              <div className="kk-row">
                <button
                  className="kk-btn kk-btn--danger"
                  disabled={deleting || motSuppr !== SUPPR_WORD}
                  onClick={() => (reauthNeeded ? void reauthThenDelete() : void runDelete())}
                >
                  {deleting ? "Suppression..." : reauthNeeded ? "Se reconnecter et supprimer" : "Confirmer la suppression"}
                </button>
                <button
                  className="kk-btn kk-btn--ghost"
                  onClick={() => { setConfirming(false); setReauthNeeded(false); setMotSuppr(""); }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
