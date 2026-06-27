import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The Supabase client — or `null` when the project keys aren't configured.
 *
 * Both vars are PUBLIC by design (the anon key is meant to ship in the browser
 * bundle; every write is guarded by row-level-security on the server). The
 * service_role key must NEVER appear here or in any VITE_ var.
 *
 * When the env is absent the client is null and the whole login/league layer
 * stays dormant: no sign-in button, no League tab, the app runs exactly as it
 * did before on localStorage alone. That's what lets us ship this code now and
 * have it light up the moment the keys land in Vercel.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

/** True only when the backend is configured — gates all auth/league UI. */
export const authEnabled = supabase !== null
