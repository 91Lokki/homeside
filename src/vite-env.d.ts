/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL — public by design. Absent ⇒ auth + league stay off. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon/publishable key — public by design (RLS guards every write). */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
