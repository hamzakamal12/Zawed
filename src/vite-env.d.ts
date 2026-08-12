/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_DEFAULT_VAT_PERCENT?: string
  readonly VITE_QUOTE_VALIDITY_DAYS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
