interface ImportMetaEnv {
  readonly VITE_MIGRATION_API_BASE_URL?: string
  readonly VITE_REOWN_PROJECT_ID?: string
  readonly VITE_AI_CREDITS_BACKEND_URL?: string
  readonly VITE_AI_CREDITS_BASE_RPC_URL?: string
  readonly VITE_AI_CREDITS_CELO_RPC_URL?: string
  readonly VITE_AI_CREDITS_FUNDING_VAULT_ADDRESS?: string
  readonly VITE_AI_CREDITS_VAULT_ADDRESS?: string
  readonly VITE_AI_CREDITS_GOODID_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
