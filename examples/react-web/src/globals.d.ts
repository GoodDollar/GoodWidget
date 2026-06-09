declare const process: {
  env: Record<string, string | undefined>
}

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly MODE: string
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare function setImmediate(callback: (...args: unknown[]) => void, ...args: unknown[]): number
