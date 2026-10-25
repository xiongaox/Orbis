/// <reference types="vite/client" />

/** 应用版本号（vite define 注入，来源 src-tauri/tauri.conf.json 的 version） */
declare const __APP_VERSION__: string

declare module '*.html?raw' {
  const content: string
  export default content
}

interface ImportMetaEnv {
  /** VITE_DATA_SCOPE=demo 时启用隔离演示库（见 localPrivateStore 的库名后缀） */
  readonly VITE_DATA_SCOPE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
