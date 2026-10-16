import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** `null` until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set — callers must check. */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          flowType: "pkce", // confirmation / recovery / OAuth links arrive as ?code=… and are exchanged on the client
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;

/**
 * Sign-in providers that are actually configured for the project. The client cannot discover this from
 * Supabase, so it's declared by deployment config: VITE_AUTH_PROVIDERS="google" (comma separated).
 * Nothing is offered unless it's listed here.
 */
export const enabledProviders: readonly "google"[] = (
  (import.meta.env.VITE_AUTH_PROVIDERS as string | undefined) ?? ""
)
  .split(",")
  .map((s) => s.trim())
  .filter((s): s is "google" => s === "google");
