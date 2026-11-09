import React, { useEffect, useRef, useState } from 'react'
import { GoodWidgetProvider, type EIP1193Provider } from '@goodwidget/core'
import type { Meta, StoryObj } from '@storybook/react'
import {
  AiCreditsWidget,
  useAiCreditsAdapter,
  type AiCreditsWidgetAdapterActions,
} from '@goodwidget/ai-credits-widget'
import {
  MockAiCreditsBackendClient,
  MockAiCreditsChainClient,
} from '@goodwidget/ai-credits-widget/mocked'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'

const FUNDED_BUYER = '0x0000000000000000000000000000000000000011'
const EMPTY_BUYER = '0x0000000000000000000000000000000000000022'

class BuyerBalanceFixture extends MockAiCreditsChainClient {
  balance = 1n
  fail = false
  delay = false

  async getBuyerStoredBalance(buyer: string): Promise<bigint> {
    const balance = buyer.toLowerCase() === FUNDED_BUYER ? this.balance : 0n
    if (this.delay) await new Promise((resolve) => setTimeout(resolve, 600))
    if (this.fail) throw new Error('Fixture buyer RPC unavailable')
    return balance
  }
}

function BuyerMinimumsAdapter({
  fixture,
  actions,
}: {
  fixture: {
    chain: BuyerBalanceFixture
    backend: MockAiCreditsBackendClient
    provider: EIP1193Provider
  }
  actions: React.MutableRefObject<AiCreditsWidgetAdapterActions | null>
}) {
  const adapter = useAiCreditsAdapter({
    backendClient: fixture.backend,
    chainClient: fixture.chain,
    celoRpcUrl: 'https://ai-credits-minimums.invalid/rpc',
  })
  actions.current = adapter.actions
  return (
    <AiCreditsWidget
      provider={fixture.provider}
      adapterFactory={() => adapter}
      testId="AiCreditsWidget-buyer-minimums"
    />
  )
}

/** Real adapter fixture: only external wallet, RPC and backend boundaries are mocked. */
function BuyerMinimumsFixture() {
  const [fixture] = useState(() => {
    const wallet = createCustodialEip1193Provider()
    const chain = new BuyerBalanceFixture({ operatorAccepted: true, gdUsdPerToken: 1 })
    let walletSubmissions = 0
    return {
      chain,
      backend: new MockAiCreditsBackendClient(),
      submissions: () => walletSubmissions,
      provider: {
        ...wallet,
        request: async (request: Parameters<typeof wallet.request>[0]) => {
          if (request.method === 'eth_sendTransaction') {
            walletSubmissions += 1
            throw new Error('Fixture never broadcasts transactions')
          }
          return wallet.request(request)
        },
      },
    }
  })
  const [ready, setReady] = useState(false)
  const [result, setResult] = useState('')
  const actions = useRef<AiCreditsWidgetAdapterActions | null>(null)

  useEffect(() => {
    let cancelled = false
    void fixture.provider.request({ method: 'eth_accounts' }).then((accounts) => {
      if (cancelled) return
      const payer = (accounts as string[])[0].toLowerCase()
      localStorage.setItem(
        `goodwidget.ai-credits.payerSession.${payer}`,
        JSON.stringify({
          knownSigners: [FUNDED_BUYER, EMPTY_BUYER],
          activeSignerAddress: FUNDED_BUYER,
          derivedSignerAddress: null,
          signerKeys: {
            [FUNDED_BUYER]: { operatorConsented: true },
            [EMPTY_BUYER]: { operatorConsented: true },
          },
        }),
      )
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [fixture])

  async function submitDirectly() {
    try {
      await actions.current!.pay({ depositAmountG: '0.5', streamAmountG: '0' })
      setResult('Accepted')
    } catch (error) {
      setResult(
        `${error instanceof Error ? error.message : String(error)}; wallet submissions: ${fixture.submissions()}`,
      )
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div data-testid="BuyerMinimums-controls">
        <button
          onClick={() => {
            void actions.current?.selectSigner(EMPTY_BUYER)
          }}
        >
          Select empty buyer
        </button>
        <button
          onClick={() => {
            void actions.current?.selectSigner(FUNDED_BUYER)
          }}
        >
          Select funded buyer
        </button>
        <button
          onClick={() => {
            fixture.chain.balance = 0n
          }}
        >
          Empty stored balance
        </button>
        <button
          onClick={() => {
            fixture.chain.fail = true
            void actions.current?.refresh()
          }}
        >
          Fail balance read
        </button>
        <button
          onClick={() => {
            fixture.chain.fail = false
            void actions.current?.refresh()
          }}
        >
          Retry balance read
        </button>
        <button
          onClick={() => {
            fixture.chain.delay = true
          }}
        >
          Delay balance reads
        </button>
        <button
          onClick={() => {
            void submitDirectly()
          }}
        >
          Submit directly
        </button>
        <output data-testid="BuyerMinimums-result">{result}</output>
      </div>
      {ready && (
        <GoodWidgetProvider provider={fixture.provider}>
          <BuyerMinimumsAdapter fixture={fixture} actions={actions} />
        </GoodWidgetProvider>
      )}
    </div>
  )
}

const meta: Meta = {
  title: 'QA/AiCreditsWidget/Buyer Minimums',
  parameters: {
    layout: 'padded',
    goodWidgetProvider: { disableProvider: true, useShell: false },
  },
}
export default meta
type Story = StoryObj<typeof meta>
export const BuyerSwitching: Story = { render: () => <BuyerMinimumsFixture /> }
