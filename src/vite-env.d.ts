/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_DEFAULT_VAT_PERCENT?: string
  readonly VITE_QUOTE_VALIDITY_DAYS?: string
  // Letterhead printed on generated PDF documents.
  readonly VITE_SUPPLIER_NAME?: string
  readonly VITE_SUPPLIER_ADDRESS?: string
  readonly VITE_SUPPLIER_PHONE?: string
  readonly VITE_SUPPLIER_EMAIL?: string
  readonly VITE_SUPPLIER_TAX_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
