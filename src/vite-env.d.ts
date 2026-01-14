/// <reference types="vite/client" />

declare module '*.html?raw' {
  const content: string
  export default content
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_ANON_KEY_PART1?: string
  readonly VITE_SUPABASE_ANON_KEY_PART2?: string
  readonly VITE_SUPABASE_ANON_KEY_PART3?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
