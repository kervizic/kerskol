// Couche d'acces aux donnees. Une seule surface pour l'UI ; bascule
// transparente entre Supabase (prod) et le jeu de donnees demo (local).

import { supabase } from "./supabase";
import { purgeKerskolStorage } from "./authReset";
import { computeVerif, type VerifOp, type VerifOp2 } from "../domain/calcul/generator";
import { estJuste, estJusteConjugaison } from "../domain/diagnostic";
import { TEMPS_PAR_CODE, type Personne } from "../domain/francais/conjugaison";
import {
  isDemo,
  DEMO_COMPETENCES,
  DEMO_FOYER_ID,
  DEMO_JOURNAL,
  DEMO_MATIERES,
  DEMO_PREREQUIS,
  DEMO_PROFILS,
  demoProgression,
} from "./demo";
import type {
  Avatar,
  Competence,
  JournalReglage,
  LienEnAttente,
  Matiere,
  Prerequis,
  Profil,
  Progression,
  ProgressionDetail,
  UniversId,
  Classe,
} from "./types";
import type { ExCalcul, Forme, Support } from "../domain/calcul/generator";
import { SEED_SOURCES } from "../domain/calcul/seedSources";

export interface AuthUser {
  id: string;
  email: string | null;
}

const REDIRECT_TO = "https://kerskol.fr";

export async function getUser(): Promise<AuthUser | null> {
  if (isDemo()) return { id: "demo-parent", email: "parent@demo.kerskol" };
  // getSession() lit la session PERSISTEE (localStorage) et attend l'hydratation,
  // SANS appel reseau : fiable au rechargement (F5). getUser() ferait un aller
  // /auth/v1/user qui, au demarrage, peut devancer la restauration -> null a tort.
  const { data } = await supabase().auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? null } : null;
}

// Transmet l'evenement et l'id utilisateur (ou null) : l'appelant decide via
// authAction() s'il faut (re)bootstrap, se deconnecter, ou ignorer (meme user).
export function onAuthChange(
  cb: (event: string, userId: string | null) => void
): () => void {
  if (isDemo()) return () => {};
  const { data } = supabase().auth.onAuthStateChange((event, session) => {
    cb(event, session?.user?.id ?? null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signInGoogle(): Promise<void> {
  if (isDemo()) return;
  await supabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: REDIRECT_TO },
  });
}

// Reconnexion Google (pour lever une exigence de reauthentification recente).
export async function reauthGoogle(): Promise<void> {
  await signInGoogle();
}

export async function signOut(): Promise<void> {
  purgeKerskolStorage();
  if (isDemo()) return;
  await supabase().auth.signOut();
}

// Levee quand creer_foyer() refuse une inscription (lancement public non ouvert).
export class InscriptionsFermeesError extends Error {
  code = "inscriptions_fermees";
  constructor() {
    super("inscriptions_fermees");
    this.name = "InscriptionsFermeesError";
  }
}

// creer_foyer() est idempotent : renvoie le foyer existant ou en cree un.
// Peut lever InscriptionsFermeesError si le compte n'est pas autorise.
export async function ensureFoyer(): Promise<string> {
  if (isDemo()) return DEMO_FOYER_ID;
  const { data, error } = await supabase().rpc("creer_foyer");
  if (error) {
    if (String(error.message || "").includes("inscriptions_fermees")) {
      throw new InscriptionsFermeesError();
    }
    throw error;
  }
  return data as string;
}

export async function listProfils(foyerId: string): Promise<Profil[]> {
  if (isDemo()) return DEMO_PROFILS.filter((p) => p.foyer_id === foyerId);
  const { data, error } = await supabase()
    .from("profils")
    .select(
      "id, foyer_id, surnom, avatar, univers, classe, matieres_actives, limite_jour_min, limite_semaine_min, monnaie, user_id"
    )
    .eq("foyer_id", foyerId)
    .order("cree_le", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profil[];
}

// Lecture d'un seul profil par id (utilise pour l'entree directe d'un enfant
// relie : le RLS ne lui laisse voir que son propre profil).
export async function getProfilById(id: string): Promise<Profil> {
  if (isDemo()) {
    const p = DEMO_PROFILS.find((x) => x.id === id);
    if (!p) throw new Error("profil introuvable");
    return p;
  }
  const { data, error } = await supabase()
    .from("profils")
    .select(
      "id, foyer_id, surnom, avatar, univers, classe, matieres_actives, limite_jour_min, limite_semaine_min, monnaie, user_id"
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Profil;
}

// Etat du compte au login vis-a-vis d'un lien enfant, SANS divulgation de foyer
// ni de profil. etat : relie | en_attente | email_non_confirme | aucun.
export interface StatutLien {
  etat: "relie" | "en_attente" | "email_non_confirme" | "aucun";
  profil_id?: string;
}

export async function statutLienEnfant(): Promise<StatutLien> {
  if (isDemo()) return { etat: "aucun" };
  const { data, error } = await supabase().rpc("statut_lien_enfant");
  if (error) throw error;
  return (data as StatutLien) ?? { etat: "aucun" };
}

// Resultat d'une tentative de validation par code (migration 0020).
// Apres le BON code seulement, l'etat peut demander une confirmation selon la
// situation du compte connecte (deja relie ailleurs / parent seul de son foyer),
// ou refuser (foyer partage), ou exiger une reauth Google recente.
export interface ValidationLien {
  ok: boolean;
  etat?:
    | "code_invalide"
    | "annule"
    | "email_non_confirme"
    | "aucun"
    | "confirmation_autre_profil" // deja relie a un autre profil : confirmer ?
    | "confirmation_fusion" // parent seul (cas c) : fusionner son espace dans ce profil ?
    | "refus_foyer_partage"; // parent d'un foyer partage : impossible
  profil_id?: string;
  essais_restants?: number;
  nb_profils?: number; // nombre de profils de l'ancien foyer (cas c)
  // Profils de l'ancien foyer (cas c) : l'enfant choisit la source si > 1.
  // C'est SON propre foyer : aucune fuite d'information d'un tiers.
  profils_source?: { id: string; surnom: string }[];
}

// valider_lien_enfant(code, confirmer, source) : relie si le code est bon ; sinon
// compte l'essai. confirmer=true valide l'ecran de confirmation (delien d'un autre
// profil, ou FUSION de l'ancien espace du compte, cas c). source = profil de
// l'ancien foyer a fusionner quand il en contient plusieurs. Ne jette pas pour un
// mauvais code (resultat structure, compteur persiste).
export async function validerLienEnfant(
  code: string,
  confirmer = false,
  sourceProfilId?: string
): Promise<ValidationLien> {
  if (isDemo()) return { ok: false, etat: "aucun" };
  const { data, error } = await supabase().rpc("valider_lien_enfant", {
    p_code: code,
    p_confirmer: confirmer,
    p_source_profil: sourceProfilId ?? null,
  });
  if (error) throw error;
  return (data as ValidationLien) ?? { ok: false, etat: "aucun" };
}

// refuser_lien_enfant : "Ce n'est pas moi" -> supprime le lien en attente.
export async function refuserLienEnfant(): Promise<void> {
  if (isDemo()) return;
  const { error } = await supabase().rpc("refuser_lien_enfant");
  if (error) throw error;
}

// Liens de rattachement en attente pour les profils d'un foyer (vue parent).
export async function listLiensEnAttente(foyerId: string): Promise<LienEnAttente[]> {
  if (isDemo()) return [];
  const { data, error } = await supabase()
    .from("liens_enfant_en_attente")
    .select("id, profil_id, email, expire_le, cree_le, profils!inner(foyer_id)")
    .eq("profils.foyer_id", foyerId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    profil_id: r.profil_id as string,
    email: r.email as string,
    expire_le: r.expire_le as string,
    cree_le: r.cree_le as string,
  }));
}

// Messages d'erreur clairs pour le parent (codes remontes par les RPC).
// Depuis 0020, demander_lien_enfant n'echoue plus selon le STATUT du compte
// cible (anti-enumeration) : elle renvoie toujours un code, sauf adresse
// invalide / profil d'un autre foyer / doublon de lien (abus). La situation du
// compte (parent, relie ailleurs...) est traitee a la validation, par son
// titulaire.
const LIEN_ERREURS: Record<string, string> = {
  email_invalide: "Adresse e-mail invalide.",
  profil_introuvable: "Profil introuvable.",
  profil_deja_relie: "Ce profil est déjà relié à un compte.",
  lien_deja_en_attente: "Un lien est déjà en attente pour ce profil.",
  email_deja_en_attente: "Cette adresse est déjà en attente sur un profil.",
  non_relie: "Ce profil n’est relié à aucun compte.",
};

function lienError(e: unknown): Error {
  const msg = String((e as { message?: string })?.message ?? e ?? "");
  const code = Object.keys(LIEN_ERREURS).find((k) => msg.includes(k));
  // Diagnostic : on journalise le code technique reel (jamais d'e-mail, les RPC
  // ne l'incluent pas dans leurs messages). L'utilisateur ne voit qu'un message
  // clair et non enumerant.
  console.error("lien enfant: code d'erreur", code ?? msg);
  return new Error(code ? LIEN_ERREURS[code] : "Une erreur est survenue.");
}

// Cree un lien de rattachement en attente (parent) et renvoie le CODE a 3
// chiffres a transmettre a l'enfant (affiche une seule fois). L'email est
// normalise en base.
export async function demanderLienEnfant(profilId: string, email: string): Promise<string> {
  if (isDemo()) return "000";
  const { data, error } = await supabase().rpc("demander_lien_enfant", {
    p_profil: profilId,
    p_email: email,
  });
  if (error) throw lienError(error);
  return String(data ?? "");
}

// Annule un lien en attente (parent). DELETE protege par RLS (parent du foyer).
export async function annulerLienEnfant(lienId: string): Promise<void> {
  if (isDemo()) return;
  const { error } = await supabase()
    .from("liens_enfant_en_attente")
    .delete()
    .eq("id", lienId);
  if (error) throw error;
}

// Delie le compte Google d'un profil (parent) : user_id -> null, journalise.
export async function delierCompteEnfant(profilId: string): Promise<void> {
  if (isDemo()) return;
  const { error } = await supabase().rpc("delier_compte_enfant", { p_profil: profilId });
  if (error) throw lienError(error);
}

export interface CreateProfilInput {
  foyer_id: string;
  surnom: string;
  avatar: Avatar;
  univers: UniversId;
  classe: Classe;
  matieres_actives: string[];
  limite_jour_min: number | null;
  limite_semaine_min: number | null;
}

export async function createProfil(input: CreateProfilInput): Promise<Profil> {
  if (isDemo()) {
    const p: Profil = { id: `demo-${Date.now()}`, monnaie: 0, ...input };
    DEMO_PROFILS.push(p);
    return p;
  }
  const { data, error } = await supabase()
    .from("profils")
    .insert(input)
    .select(
      "id, foyer_id, surnom, avatar, univers, classe, matieres_actives, limite_jour_min, limite_semaine_min, monnaie"
    )
    .single();
  if (error) throw error;
  return data as Profil;
}

export async function updateProfil(
  id: string,
  patch: Partial<
    Pick<
      Profil,
      | "surnom"
      | "avatar"
      | "univers"
      | "classe"
      | "matieres_actives"
      | "limite_jour_min"
      | "limite_semaine_min"
    >
  >
): Promise<void> {
  if (isDemo()) {
    const p = DEMO_PROFILS.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return;
  }
  const { error } = await supabase().from("profils").update(patch).eq("id", id);
  if (error) throw error;
}

export interface Referentiel {
  matieres: Matiere[];
  competences: Competence[];
  prerequis: Prerequis[];
}

export async function getReferentiel(): Promise<Referentiel> {
  if (isDemo()) {
    return {
      matieres: DEMO_MATIERES,
      competences: DEMO_COMPETENCES,
      prerequis: DEMO_PREREQUIS,
    };
  }
  const sb = supabase();
  const [mat, comp, pre] = await Promise.all([
    sb.from("matieres").select("code, libelle"),
    sb
      .from("competences")
      .select("code, matiere, domaine, libelle, ordre, nb_niveaux, actif")
      .eq("matiere", "MA")
      .order("ordre", { ascending: true }),
    sb.from("competence_prerequis").select("competence, prerequis, niveau_min"),
  ]);
  if (mat.error) throw mat.error;
  if (comp.error) throw comp.error;
  if (pre.error) throw pre.error;
  return {
    matieres: (mat.data ?? []) as Matiere[],
    competences: (comp.data ?? []) as Competence[],
    prerequis: (pre.data ?? []) as Prerequis[],
  };
}

export async function getProgression(profilId: string): Promise<Progression[]> {
  if (isDemo()) return demoProgression(profilId);
  const { data, error } = await supabase()
    .from("progression")
    .select("profil_id, competence, niveau, niveau_max_atteint, placement_termine")
    .eq("profil_id", profilId);
  if (error) throw error;
  return (data ?? []) as Progression[];
}

// Progression detaillee (session) : tous les champs utiles a la composition.
export async function getProgressionDetail(
  profilId: string
): Promise<ProgressionDetail[]> {
  if (isDemo()) {
    return demoProgression(profilId).map((p) => ({
      competence: p.competence,
      niveau: p.niveau,
      niveau_max_atteint: p.niveau_max_atteint,
      placement_termine: p.placement_termine,
      ema_courte: 0.7,
      derniere_reponse: "2026-09-01T00:00:00Z",
      prochaine_revision: "2026-09-01T00:00:00Z",
    }));
  }
  const { data, error } = await supabase()
    .from("progression")
    .select(
      "competence, niveau, niveau_max_atteint, placement_termine, ema_courte, derniere_reponse, prochaine_revision"
    )
    .eq("profil_id", profilId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    competence: r.competence as string,
    niveau: r.niveau as number,
    niveau_max_atteint: r.niveau_max_atteint as number,
    placement_termine: r.placement_termine as boolean,
    ema_courte: Number(r.ema_courte ?? 0),
    derniere_reponse: (r.derniere_reponse as string | null) ?? null,
    prochaine_revision: (r.prochaine_revision as string | null) ?? null,
  }));
}

// Catalogue des exercices de calcul (exercices + ex_calcul). Repli sur la copie
// cliente (SEED_SOURCES) si la lecture echoue, pour ne jamais bloquer la seance.
export async function getExercicesCalcul(): Promise<ExCalcul[]> {
  if (isDemo()) return SEED_SOURCES;
  try {
    const { data, error } = await supabase()
      .from("exercices")
      .select(
        "id, competence, niveau, methode, ex_calcul(operation, forme, params, support_visuel, correction_strategie)"
      )
      .eq("type", "calcul")
      .eq("actif", true);
    if (error) throw error;
    const rows = (data ?? [])
      .map((e): ExCalcul | null => {
        const ex = Array.isArray((e as Record<string, unknown>).ex_calcul)
          ? ((e as Record<string, unknown>).ex_calcul as Record<string, unknown>[])[0]
          : ((e as Record<string, unknown>).ex_calcul as Record<string, unknown> | undefined);
        if (!ex) return null;
        return {
          exerciceId: e.id as string,
          competence: e.competence as string,
          niveau: e.niveau as number,
          methode: (e.methode as string | null) ?? null,
          operation: ex.operation as string,
          forme: ex.forme as Forme,
          params: (ex.params as Record<string, unknown>) ?? {},
          support: (ex.support_visuel as Support) ?? null,
          correctionStrategie: (ex.correction_strategie as string | null) ?? null,
        };
      })
      .filter((x): x is ExCalcul => x !== null);
    return rows.length > 0 ? rows : SEED_SOURCES;
  } catch {
    return SEED_SOURCES;
  }
}

// Referentiel FRANCAIS : competences (matiere FR) + sources d'exercices. La
// GENERATION des exercices de conjugaison est faite cote client (le generateur
// derive verbes/personnes de domain/francais/conjugaison) ; les lignes
// `exercices` (type 'conjugaison') ne fournissent que l'identite (exercice_id
// deterministe, competence, niveau, methode). Les prerequis FR sont deja
// charges par getReferentiel (requete competence_prerequis sans filtre).
export async function getFrancais(): Promise<{ competences: Competence[]; sources: ExCalcul[] }> {
  if (isDemo()) return { competences: [], sources: [] };
  const sb = supabase();
  const [comp, ex] = await Promise.all([
    sb
      .from("competences")
      .select("code, matiere, domaine, libelle, ordre, nb_niveaux, actif")
      .eq("matiere", "FR")
      .eq("actif", true)
      .order("ordre", { ascending: true }),
    sb
      .from("exercices")
      .select("id, competence, niveau, methode")
      .eq("type", "conjugaison")
      .eq("actif", true),
  ]);
  if (comp.error) throw comp.error;
  if (ex.error) throw ex.error;
  const sources = (ex.data ?? []).map((e): ExCalcul => ({
    exerciceId: e.id as string,
    competence: e.competence as string,
    niveau: e.niveau as number,
    methode: (e.methode as string | null) ?? null,
    operation: "conj",
    forme: "conjugaison" as Forme,
    params: {},
    support: null,
    correctionStrategie: null,
  }));
  return { competences: (comp.data ?? []) as Competence[], sources };
}

export async function getMonnaie(profilId: string): Promise<number> {
  if (isDemo()) return DEMO_PROFILS.find((p) => p.id === profilId)?.monnaie ?? 0;
  const { data, error } = await supabase()
    .from("profils")
    .select("monnaie")
    .eq("id", profilId)
    .single();
  if (error) throw error;
  return Number((data as { monnaie: number }).monnaie ?? 0);
}

// Temps deja joue AUJOURD'HUI (secondes), pour la limite quotidienne.
export async function getTempsAujourdhuiS(profilId: string): Promise<number> {
  if (isDemo()) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase()
    .from("seances")
    .select("duree_s")
    .eq("profil_id", profilId)
    .gte("debut", start.toISOString());
  if (error) throw error;
  return (data ?? []).reduce((s, r) => s + Number((r as { duree_s: number }).duree_s ?? 0), 0);
}

// -------------------------------- Seances --------------------------------
export async function createSeance(id: string, profilId: string): Promise<void> {
  if (isDemo()) return;
  const { error } = await supabase()
    .from("seances")
    .insert({ id, profil_id: profilId, debut: new Date().toISOString() });
  if (error && !String(error.message).includes("duplicate")) throw error;
}

export async function finishSeance(
  id: string,
  patch: { duree_s: number; monnaie_gagnee: number }
): Promise<void> {
  if (isDemo()) return;
  const { error } = await supabase()
    .from("seances")
    .update({ fin: new Date().toISOString(), ...patch })
    .eq("id", id);
  if (error) throw error;
}

// -------------------------------- Reponses -------------------------------
// Lot 2 de securite : le client n'envoie plus de flag `correct`, mais l'ENONCE
// NORMALISE (operation + operandes) et la SAISIE de l'enfant. Le SERVEUR
// (RPC enregistrer_reponse) recalcule la bonne reponse et decide « juste/faux ».
export interface ReponseInsert {
  id: string; // UUID client (idempotence)
  profil_id: string;
  seance_id: string;
  competence: string;
  exercice_id: string | null;
  niveau: number;
  methode: string | null;
  op: VerifOp; // enonce normalise : operation...
  a: number; //   ...operande a...
  b: number; //   ...operande b (la reponse attendue en decoule cote serveur)
  op2?: VerifOp2 | null; // seconde etape (problemes a deux etapes), sinon null
  c?: number | null; //   operande de la seconde etape, sinon null
  reponse: number; // saisie principale de l'enfant (pour op 'lettres' : le nombre)
  reste: number | null; // saisie du reste (exercices a 2 champs), sinon null
  // Ecriture en toutes lettres (op 'lettres') : la saisie TEXTE de l'enfant, et le
  // type de faute diagnostique cote client (INDICATIF ; le serveur reste juge).
  reponse_texte?: string | null;
  type_faute?: string | null;
  // Conjugaison (op 'conj') : le verbe (infinitif), envoye au serveur dans
  // p_op2 ; a = code du temps, b = personne, reponse_texte = la forme saisie.
  cle?: string | null;
  fields: 1 | 2;
  temps_ms: number | null;
  correction_lue: boolean;
  rattrapage: boolean;
  placement: boolean;
  repondu_le: string;
  // Mode d'enregistrement : "seance" (defaut) ou "defi" (exclu de la
  // progression, credit monnaie regle en fin de defi par terminer_defi).
  mode?: "seance" | "defi";
}

// Verdict renvoye par le serveur apres enregistrement.
export interface ReponseResult {
  correct: boolean;
  monnaie: number | null;
  deja: boolean;
}

// UUID valide attendu par la colonne exercice_id (les ids "MA.xxx:n" de la copie
// cliente ne sont pas des UUID) : on n'envoie que des UUID reels.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Detecte un refus de plafond anti-abus (message serveur `plafond_*`).
export function plafondCode(e: unknown): string | null {
  const m = (e as { message?: unknown } | null)?.message;
  return typeof m === "string" && m.startsWith("plafond_") ? m : null;
}

export async function insertReponse(row: ReponseInsert): Promise<ReponseResult> {
  // Reponse en file au format anterieur au lot 2 (sans enonce normalise) :
  // on l'ecarte proprement pour ne pas bloquer la file (perte negligeable).
  if (!row.op) return { correct: false, monnaie: null, deja: true };
  if (isDemo()) {
    const { answer, reste } = computeVerif({
      op: row.op, a: row.a, b: row.b,
      op2: row.op2 ?? undefined, c: row.c ?? undefined,
    });
    // Ecriture en lettres : on juge le TEXTE (trad ou 1990), comme le serveur.
    const correct =
      row.op === "lettres"
        ? estJuste(row.a, row.reponse_texte ?? "")
        : row.op === "conj"
          ? estJusteConjugaison(
              row.cle ?? "", TEMPS_PAR_CODE[row.a], row.b as Personne, row.reponse_texte ?? ""
            )
          : row.reponse === answer && (row.fields < 2 || row.reste === reste);
    const p = DEMO_PROFILS.find((x) => x.id === row.profil_id);
    if (p) {
      const tooFast = row.temps_ms != null && row.temps_ms < 1500;
      const gain = tooFast ? 0 : correct && row.rattrapage ? 3 : correct ? 2 : row.correction_lue ? 1 : 0;
      p.monnaie += gain;
      return { correct, monnaie: p.monnaie, deja: false };
    }
    return { correct, monnaie: null, deja: false };
  }
  const { data, error } = await supabase().rpc("enregistrer_reponse", {
    p_id: row.id,
    p_profil: row.profil_id,
    p_seance: row.seance_id,
    p_competence: row.competence,
    p_exercice: row.exercice_id && UUID_RE.test(row.exercice_id) ? row.exercice_id : null,
    p_niveau: row.niveau,
    p_methode: row.methode,
    p_op: row.op,
    p_a: row.a,
    p_b: row.b,
    p_op2: row.op2 ?? row.cle ?? null,
    p_c: row.c ?? null,
    p_reponse: row.reponse,
    p_reste: row.reste,
    p_fields: row.fields,
    p_temps_ms: row.temps_ms,
    p_correction_lue: row.correction_lue,
    p_rattrapage: row.rattrapage,
    p_placement: row.placement,
    p_repondu_le: row.repondu_le,
    p_mode: row.mode ?? "seance",
    p_reponse_texte: row.reponse_texte ?? null,
    p_type_faute: row.type_faute ?? null,
  });
  if (error) throw error;
  const d = (data ?? {}) as { correct?: boolean; monnaie?: number | null; deja?: boolean };
  return { correct: Boolean(d.correct), monnaie: d.monnaie ?? null, deja: Boolean(d.deja) };
}

// -------------------------------- Defi chrono ----------------------------
// Resultat (serveur) d'un defi termine : SCORE et RECORD calcules cote serveur
// a partir des reponses verifiees ; le client ne peut pas declarer un score.
export interface DefiResult {
  score: number;
  record: number;
  nouveau_record: boolean;
  credit: number; // monnaie creditee (respecte le plafond jour + plafond defi)
  monnaie: number | null; // total du profil apres credit
}

// Cloture un defi : le serveur compte les bonnes reponses (mode='defi') de la
// seance, gere le record du theme et credite la monnaie. Idempotent.
export async function terminerDefi(seanceId: string, theme: string): Promise<DefiResult> {
  if (isDemo()) {
    return { score: 0, record: 0, nouveau_record: false, credit: 0, monnaie: null };
  }
  const { data, error } = await supabase().rpc("terminer_defi", {
    p_seance: seanceId,
    p_theme: theme,
  });
  if (error) throw error;
  const d = (data ?? {}) as Partial<DefiResult>;
  return {
    score: Number(d.score ?? 0),
    record: Number(d.record ?? 0),
    nouveau_record: Boolean(d.nouveau_record),
    credit: Number(d.credit ?? 0),
    monnaie: d.monnaie ?? null,
  };
}

// Resume des defis d'un profil (vue parent) : record par theme + nombre de defis.
export interface DefiResume {
  theme: string;
  nb: number;
  record: number;
  dernier: string | null;
}
export async function getDefiResume(profilId: string): Promise<DefiResume[]> {
  if (isDemo()) return [];
  const { data, error } = await supabase()
    .from("defi_resultats")
    .select("theme, score, cree_le")
    .eq("profil_id", profilId);
  if (error) throw error;
  const rows = (data ?? []) as { theme: string; score: number; cree_le: string }[];
  const byTheme = new Map<string, DefiResume>();
  for (const r of rows) {
    const cur = byTheme.get(r.theme) ?? { theme: r.theme, nb: 0, record: 0, dernier: null };
    cur.nb += 1;
    cur.record = Math.max(cur.record, Number(r.score ?? 0));
    if (!cur.dernier || r.cree_le > cur.dernier) cur.dernier = r.cree_le;
    byTheme.set(r.theme, cur);
  }
  return [...byTheme.values()];
}

export async function getJournal(foyerId: string): Promise<JournalReglage[]> {
  if (isDemo()) return DEMO_JOURNAL;
  const { data, error } = await supabase()
    .from("journal_reglages")
    .select("id, foyer_id, profil_id, cle, ancienne, nouvelle, cree_le")
    .eq("foyer_id", foyerId)
    .order("cree_le", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as JournalReglage[];
}

export class ReauthRequiseError extends Error {
  constructor() {
    super("reauth_requise");
    this.name = "ReauthRequiseError";
  }
}

// Levee quand supprimer_foyer est appele sans le mot de confirmation « SUPPRIMER ».
export class ConfirmationRequiseError extends Error {
  constructor() {
    super("confirmation_requise");
    this.name = "ConfirmationRequiseError";
  }
}

// supprimer_foyer : exige le mot « SUPPRIMER » (confirmation forte, car Google
// peut revenir sans rien redemander) PUIS une reconnexion recente (< 5 min).
// Remonte des erreurs typees pour piloter l'UI (saisie du mot, relance Google).
export async function deleteFoyer(foyerId: string, confirmation: string): Promise<void> {
  if (isDemo()) return;
  const { error } = await supabase().rpc("supprimer_foyer", {
    p_foyer: foyerId,
    p_confirmation: confirmation,
  });
  if (error) {
    const msg = String(error.message || "");
    if (msg.includes("confirmation_requise")) throw new ConfirmationRequiseError();
    if (msg.includes("reauth_requise")) throw new ReauthRequiseError();
    throw error;
  }
}
