import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDemo } from "./demo";

// URL publique : https://kerskol.fr. supabase-js ajoute /auth/v1 et /rest/v1,
// que nginx route vers GoTrue et PostgREST (prefixe retire).
// L'ANON_KEY est publique par nature ; injectee au build via VITE_ depuis
// /opt/kerskol/.env (jamais commitee).
const url = import.meta.env.VITE_SUPABASE_URL || "https://kerskol.fr";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// En mode demo local, aucun appel reseau : on n'instancie pas de vrai client.
let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (isDemo()) {
    throw new Error("supabase() ne doit pas etre appele en mode demo");
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export const SUPABASE_CONFIGURED = Boolean(anonKey);
