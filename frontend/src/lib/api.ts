// Couche d'acces aux donnees. Une seule surface pour l'UI ; bascule
// transparente entre Supabase (prod) et le jeu de donnees demo (local).

import { supabase } from "./supabase";
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
  if (isDemo()) return;
  await supabase().auth.signOut();
}

// creer_foyer() est idempotent : renvoie le foyer existant ou en cree un.
export async function ensureFoyer(): Promise<string> {
  if (isDemo()) return DEMO_FOYER_ID;
  const { data, error } = await supabase().rpc("creer_foyer");
  if (error) throw error;
  return data as string;
}

export async function listProfils(foyerId: string): Promise<Profil[]> {
  if (isDemo()) return DEMO_PROFILS.filter((p) => p.foyer_id === foyerId);
  const { data, error } = await supabase()
    .from("profils")
    .select(
      "id, foyer_id, surnom, avatar, univers, classe, matieres_actives, limite_jour_min, limite_semaine_min, monnaie"
    )
    .eq("foyer_id", foyerId)
    .order("cree_le", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profil[];
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
export interface ReponseInsert {
  id: string; // UUID client (idempotence)
  profil_id: string;
  seance_id: string;
  competence: string;
  exercice_id: string | null;
  niveau: number;
  methode: string | null;
  correct: boolean;
  temps_ms: number | null;
  aide_utilisee: boolean;
  correction_lue: boolean;
  rattrapage: boolean;
  placement: boolean;
  repondu_le: string;
}

// UUID valide attendu par la colonne exercice_id (les ids "MA.xxx:n" de la copie
// cliente ne sont pas des UUID) : on n'envoie que des UUID reels.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function insertReponse(row: ReponseInsert): Promise<void> {
  if (isDemo()) {
    const p = DEMO_PROFILS.find((x) => x.id === row.profil_id);
    if (p) {
      const tooFast = row.temps_ms != null && row.temps_ms < 1500;
      const gain = tooFast
        ? 0
        : row.correct && row.rattrapage
          ? 3
          : row.correct
            ? 2
            : row.correction_lue
              ? 1
              : 0;
      p.monnaie += gain;
    }
    return;
  }
  const payload: ReponseInsert = {
    ...row,
    exercice_id: row.exercice_id && UUID_RE.test(row.exercice_id) ? row.exercice_id : null,
  };
  const { error } = await supabase()
    .from("reponses")
    .upsert(payload, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
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

// supprimer_foyer : peut renvoyer 'reauth_requise' si la connexion n'est pas
// recente (< 5 min). On remonte une erreur typee pour relancer Google.
export async function deleteFoyer(foyerId: string): Promise<void> {
  if (isDemo()) return;
  const { error } = await supabase().rpc("supprimer_foyer", { p_foyer: foyerId });
  if (error) {
    if (String(error.message || "").includes("reauth_requise")) {
      throw new ReauthRequiseError();
    }
    throw error;
  }
}
