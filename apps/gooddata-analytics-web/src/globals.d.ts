declare const process: {
  env: Record<string, string | undefined>
}

interface ImportMetaEnv {
  readonly VITE_ANTSEED_ANALYTICS_WORKER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
