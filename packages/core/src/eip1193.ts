export interface RequestArguments {
  method: string
  params?: readonly unknown[] | Record<string, unknown>
}

export interface ProviderRpcError extends Error {
  code: number
  data?: unknown
}

export interface ProviderConnectInfo {
  chainId: string
}

export interface ProviderMessage {
  type: string
  data: unknown
}

export type EIP1193EventMap = {
  connect: (info: ProviderConnectInfo) => void
  disconnect: (error: ProviderRpcError) => void
  chainChanged: (chainId: string) => void
  accountsChanged: (accounts: string[]) => void
  message: (message: ProviderMessage) => void
}

export interface EIP1193Provider {
  request(args: RequestArguments): Promise<unknown>
  on<E extends keyof EIP1193EventMap>(event: E, listener: EIP1193EventMap[E]): void
  removeListener<E extends keyof EIP1193EventMap>(event: E, listener: EIP1193EventMap[E]): void
}

export const EIP1193_ERROR_CODES = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
} as const
