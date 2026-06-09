declare const process: {
  env: Record<string, string | undefined>
}

interface ImportMetaEnv {
  readonly VITE_MIGRATION_API_BASE_URL?: string
  readonly VITE_MIGRATION_API_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare function setImmediate(callback: (...args: unknown[]) => void, ...args: unknown[]): number
