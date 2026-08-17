import React, { useEffect, useMemo, useState } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { YStack } from '@goodwidget/ui'
import {
  CitizenClaimWidget,
  createCitizenClaimWidgetCustodialExecution,
  useCitizenClaimAdapter,
  type CitizenClaimWidgetProps,
} from '@goodwidget/citizen-claim-widget'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'

const MOCK_CLAIM_ALL_ACCOUNT = '0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED1'

function createMockClaimExecutionClientBundle(chainId: number, shouldFail: boolean) {
  return {
    publicClient: {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === 'getWhitelistedRoot') {
          return '0x0000000000000000000000000000000000000001'
        }
        if (functionName === 'checkEntitlement') {
          return 1_000000000000000000n
        }
        if (functionName === 'canTop') {
          return false
        }
        if (functionName === 'getToppingAmount') {
          return 1_000000000000000000n
        }
        if (functionName === 'minTopping') {
          return 10
        }
        return 0n
      },
      estimateFeesPerGas: async () => ({ maxFeePerGas: 1n }),
      getBalance: async () => 1_000000000000000000n,
      simulateContract: async () => ({ request: { to: '0x0000000000000000000000000000000000000001' } }),
      getTransactionReceipt: async ({ hash }: { hash: `0x${string}` }) => ({
        transactionHash: hash,
        blockNumber: 1n,
        status: 'success',
      }),
      watchBlockNumber: ({ onBlockNumber }: { onBlockNumber: (value: bigint) => void }) => {
        onBlockNumber(1n)
        return () => {}
      },
    } as never,
    walletClient: {
      account: { address: MOCK_CLAIM_ALL_ACCOUNT, type: 'json-rpc' },
      chain: { id: chainId },
      writeContract: async () => {
        await new Promise((resolve) => setTimeout(resolve, shouldFail ? 1800 : 350))
        if (shouldFail) {
          throw new Error('Simulated Fuse claim failure')
        }
        return `0x${'1'.repeat(64)}` as `0x${string}`
      },
    } as never,
  }
}

function CitizenClaimWidgetStoryShell({
  provider,
  dataTestId,
  defaultTheme,
  themeOverrides,
}: {
  provider: unknown
  dataTestId: string
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: CitizenClaimWidgetProps['themeOverrides']
}) {
  const [activeChainId, setActiveChainId] = useState<number | null>(null)

  useEffect(() => {
    const eip1193Provider = provider as {
      request?: (args: { method: string }) => Promise<unknown>
      on?: (event: string, listener: (value: unknown) => void) => void
      removeListener?: (event: string, listener: (value: unknown) => void) => void
    } | null

    if (!eip1193Provider?.request) return

    const syncChain = async () => {
      const hex = (await eip1193Provider.request?.({ method: 'eth_chainId' })) as string
      if (typeof hex === 'string') setActiveChainId(parseInt(hex, 16))
    }

    const onChainChanged = (hex: unknown) => {
      if (typeof hex === 'string') setActiveChainId(parseInt(hex, 16))
    }

    void syncChain()
    eip1193Provider.on?.('chainChanged', onChainChanged)
    return () => eip1193Provider.removeListener?.('chainChanged', onChainChanged)
  }, [provider])

  return (
    <CitizenClaimWidget
      provider={provider}
      environment="development"
      data-testid={dataTestId}
      chainId={activeChainId ?? 42220}
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function InjectedWalletStory({
  defaultTheme,
  themeOverrides,
}: {
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: CitizenClaimWidgetProps['themeOverrides']
} = {}) {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)

  if (!usableProvider) {
    return (
      <YStack data-testid="CitizenClaimWidget-no-wallet" style={{ width: 420 }} gap="$3">
        <strong>No injected wallet found</strong>
        <span>
          Install/enable MetaMask (or another EIP-1193 wallet) in this browser, then refresh
          Storybook.
        </span>
      </YStack>
    )
  }

  return (
    <CitizenClaimWidgetStoryShell
      provider={injectedProvider}
      dataTestId="CitizenClaimWidget-injected-wallet"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function CustodialLocalFixtureStory({
  defaultTheme,
  themeOverrides,
}: {
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: CitizenClaimWidgetProps['themeOverrides']
} = {}) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <CitizenClaimWidgetStoryShell
        provider={provider}
        dataTestId="CitizenClaimWidget-custodial-wallet"
        defaultTheme={defaultTheme}
        themeOverrides={themeOverrides}
      />
    )
  } catch (error: unknown) {
    return (
      <YStack data-testid="CitizenClaimWidget-custodial-config-error" style={{ width: 420 }}>
        <strong>Custodial fixture not configured</strong>
        <span>
          {error instanceof Error
            ? error.message
            : 'Set a local private key in custodialEip1193.ts'}
        </span>
      </YStack>
    )
  }
}

function CustodialExecutionClaimAllHarness() {
  const claimExecution = useMemo(
    () =>
      createCitizenClaimWidgetCustodialExecution({
        42220: createMockClaimExecutionClientBundle(42220, false),
        122: createMockClaimExecutionClientBundle(122, true),
      }),
    [],
  )

  const { actions } = useCitizenClaimAdapter({
    environment: 'development',
    claimExecution,
  })
  const [running, setRunning] = useState(false)
  const [durationMs, setDurationMs] = useState<number | null>(null)
  const [results, setResults] = useState<Array<{ chainId: number; status: string; message: string }>>([])

  const runClaimAll = async () => {
    setRunning(true)
    try {
      const startedAt = performance.now()
      const claimResults = await actions.claimAll([42220, 122])
      const endedAt = performance.now()
      setDurationMs(Math.round(endedAt - startedAt))
      setResults(
        claimResults.map((result) => ({
          chainId: result.chainId,
          status: result.status,
          message:
            result.status === 'fulfilled'
              ? 'ok'
              : result.error instanceof Error
                ? result.error.message
                : String(result.error ?? 'Unknown claim error'),
        })),
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <YStack data-testid="CitizenClaimWidget-custodial-claim-all-contract" style={{ width: 420 }} gap="$3">
      <button type="button" onClick={runClaimAll} disabled={running}>
        {running ? 'Running claimAll…' : 'Run claimAll'}
      </button>
      {durationMs !== null && (
        <span data-testid="CitizenClaimWidget-custodial-claim-all-duration">
          duration: {durationMs} ms
        </span>
      )}
      {results.map((result) => (
        <span
          key={result.chainId}
          data-testid={`CitizenClaimWidget-custodial-claim-all-${result.chainId}`}
        >
          chain {result.chainId}: {result.status} - {result.message}
        </span>
      ))}
    </YStack>
  )
}

export function CustodialClaimExecutionClaimAllStory() {
  return (
    <GoodWidgetProvider provider={undefined} defaultTheme="dark">
      <CustodialExecutionClaimAllHarness />
    </GoodWidgetProvider>
  )
}
