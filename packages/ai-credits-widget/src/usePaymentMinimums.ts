import { useCallback, useEffect, useState } from 'react'
import type { Address, PublicClient } from 'viem'
import type { AiCreditsChainClient } from './chainClient'
import { fetchVaultPaymentMinimums, type VaultPaymentMinimums } from './vaultMinimums'

type MinimumsRequest = {
  payer: string | null
  buyer: string | null
  chainClient: AiCreditsChainClient
  publicClient: Promise<PublicClient>
  vault: Address
  skipValidation: boolean
}

type MinimumsResult = MinimumsRequest & {
  revision: number
  minimums: VaultPaymentMinimums | null
  buyerBalance: bigint | null
  error: string | null
}

/** Loads payment minimums without letting a prior buyer's exemption survive selection changes. */
export function usePaymentMinimums(request: MinimumsRequest) {
  const { payer, buyer, chainClient, publicClient, vault, skipValidation } = request
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<MinimumsResult | null>(null)
  const refresh = useCallback(() => setRevision((previous) => previous + 1), [])

  useEffect(() => {
    if (!payer || !buyer) return
    let cancelled = false
    const identity = { payer, buyer, chainClient, publicClient, vault, skipValidation, revision }
    void Promise.allSettled([
      skipValidation
        ? Promise.resolve({ firstDepositUsd: '1.00', minDepositUsd: '1.00', minStreamUsd: '1.00' })
        : publicClient.then((client) => fetchVaultPaymentMinimums(client, vault, payer as Address)),
      skipValidation ? Promise.resolve(0n) : chainClient.getBuyerStoredBalance(buyer),
    ]).then(([minimums, balance]) => {
      if (cancelled) return
      setResult({
        ...identity,
        minimums: minimums.status === 'fulfilled' ? minimums.value : null,
        buyerBalance: balance.status === 'fulfilled' ? balance.value : null,
        error:
          minimums.status === 'rejected'
            ? 'Could not load vault minimums. Refresh to try again.'
            : balance.status === 'rejected'
              ? 'Could not check buyer balance. Refresh to try again.'
              : null,
      })
    })
    return () => { cancelled = true }
  }, [payer, buyer, chainClient, publicClient, vault, skipValidation, revision])

  const current = result &&
    result.payer === payer && result.buyer === buyer &&
    result.chainClient === chainClient && result.publicClient === publicClient &&
    result.vault === vault && result.skipValidation === skipValidation &&
    result.revision === revision ? result : null

  return {
    minDepositUsd: current?.buyerBalance === 0n
      ? current.minimums?.firstDepositUsd ?? null
      : current?.minimums?.minDepositUsd ?? null,
    minStreamUsd: current?.minimums?.minStreamUsd ?? null,
    depositBlockedReason: current?.error ??
      (!current || current.buyerBalance === null ? 'Checking buyer balance...' : null),
    refresh,
  }
}