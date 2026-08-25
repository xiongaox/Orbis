/// <reference types="vite/client" />

declare module '*.html?raw' {
  const content: string
  export default content
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
