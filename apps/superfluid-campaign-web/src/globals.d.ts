declare const process: {
  env: Record<string, string | undefined>
}

interface Window {
  ethereum?: unknown
}

interface ImportMetaEnv {
  readonly VITE_REOWN_PROJECT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
