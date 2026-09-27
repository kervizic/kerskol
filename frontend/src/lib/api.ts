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
  UniversId,
  Classe,
} from "./types";

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
