declare const process: {
  env: Record<string, string | undefined>
}

interface Window {
  ethereum?: unknown
}

interface ImportMetaEnv {
  readonly VITE_AI_CREDITS_BACKEND_URL?: string
  readonly VITE_AI_CREDITS_BASE_RPC_URL?: string
  readonly VITE_AI_CREDITS_CELO_RPC_URL?: string
  readonly VITE_AI_CREDITS_FUNDING_VAULT_ADDRESS?: string
  readonly VITE_AI_CREDITS_VAULT_ADDRESS?: string
  readonly VITE_AI_CREDITS_GOODID_ADDRESS?: string
  readonly VITE_REOWN_PROJECT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare function setImmediate(callback: (...args: unknown[]) => void, ...args: unknown[]): number
