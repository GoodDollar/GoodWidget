export const DEFAULT_RPC_URLS: Record<number, readonly string[]> = {
  42220: ['https://forno.celo.org'],
  1: ['https://ethereum-rpc.publicnode.com'],
  122: ['https://rpc.fuse.io'],
  50: ['https://rpc.xdcrpc.com', 'https://rpc.xinfin.network', 'https://rpc1.xinfin.network'],
}

export function getBridgingRpcUrlsKey(overrides?: Partial<Record<number, readonly string[]>>): string {
  return JSON.stringify(overrides ?? {})
}

export function getBridgingRpcUrls(chainId: number, overrides?: Partial<Record<number, readonly string[]>>): readonly string[] {
  const configured = overrides?.[chainId]?.filter((url) => url.trim().length > 0)
  return configured?.length ? configured : DEFAULT_RPC_URLS[chainId] ?? []
}
