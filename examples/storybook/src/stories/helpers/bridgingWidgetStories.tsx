import React from 'react'
import {
  BRIDGING_CHAINS,
  BridgingWidget,
  BridgingWidgetPreview,
  type BridgeConfig,
  type BridgeFeeQuote,
  type BridgeTransaction,
  type BridgingWidgetAdapterActions,
  type BridgingWidgetAdapterResult,
  type BridgingWidgetAdapterState,
  type BridgingWidgetProps,
  type BridgingWidgetTab,
} from '@goodwidget/bridging-widget'
import { MiniAppShell, YStack } from '@goodwidget/ui'
import { GoodWidgetProvider } from '@goodwidget/core'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'

const DEMO_ADDRESS = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'

const SAMPLE_COMPLETED_SRC_HASH =
  '0x1111111111111111111111111111111111111111111111111111111111111111'
const SAMPLE_COMPLETED_DST_HASH =
  '0x2222222222222222222222222222222222222222222222222222222222222222'
const SAMPLE_PENDING_HASH =
  '0x3333333333333333333333333333333333333333333333333333333333333333'
const SAMPLE_FAILED_HASH =
  '0x4444444444444444444444444444444444444444444444444444444444444444'

// G$ uses 18 decimals on every supported chain, so all amount fixtures below
// are plain base-unit bigints (e.g. 50 G$ == 50n * 10n ** 18n).
const G$ = (whole: number) => BigInt(whole) * 10n ** 18n

const sampleQuote: BridgeFeeQuote = {
  fee: 120000000000000n,
  feeInNative: '0.00012',
  protocol: 'LAYERZERO',
  target: DEMO_ADDRESS,
  targetChainId: BRIDGING_CHAINS.CELO,
  amount: G$(50),
  protocolFeeBps: 50n,
  protocolFee: G$(50) / 400n,
  amountReceived: G$(50) - G$(50) / 400n,
}

const sampleBridgeConfig: BridgeConfig = {
  // Unused by every current UI surface (see widgetRuntimeContract.ts) — left
  // empty here rather than pulling in @goodsdks/bridging-sdk's chain map.
  supportedChains: {},
  currentChainId: BRIDGING_CHAINS.FUSE,
  tokenBalance: G$(500),
  nativeBalance: 2000000000000000000n,
  allowance: 0n,
  fees: null,
  routeLimits: {
    minAmount: G$(1),
    dailyLimit: G$(1000000),
    txLimit: G$(300000000),
    accountDailyLimit: G$(50000),
    onlyWhitelisted: false,
  },
  routeLimitsChainId: BRIDGING_CHAINS.FUSE,
  protocolFeeBps: 50n,
  protocolFeeChainId: BRIDGING_CHAINS.CELO,
}

const sampleHistory: BridgeTransaction[] = [
  {
    hash: SAMPLE_COMPLETED_SRC_HASH,
    fromChainId: BRIDGING_CHAINS.FUSE,
    toChainId: BRIDGING_CHAINS.CELO,
    amount: G$(120),
    protocol: 'LAYERZERO',
    status: {
      status: 'completed',
      srcTxHash: SAMPLE_COMPLETED_SRC_HASH,
      dstTxHash: SAMPLE_COMPLETED_DST_HASH,
      timestamp: 1767225600,
    },
    timestamp: 1767225600,
  },
  {
    hash: SAMPLE_PENDING_HASH,
    fromChainId: BRIDGING_CHAINS.CELO,
    toChainId: BRIDGING_CHAINS.ETHEREUM,
    amount: G$(35),
    protocol: 'AXELAR',
    status: {
      status: 'pending',
      srcTxHash: SAMPLE_PENDING_HASH,
      timestamp: 1767312000,
    },
    timestamp: 1767312000,
  },
  {
    hash: SAMPLE_FAILED_HASH,
    fromChainId: BRIDGING_CHAINS.FUSE,
    toChainId: BRIDGING_CHAINS.XDC,
    amount: G$(8),
    protocol: 'LAYERZERO',
    status: {
      status: 'failed',
      srcTxHash: SAMPLE_FAILED_HASH,
      timestamp: 1767139200,
      error: 'Relay timed out before delivery confirmation.',
    },
    timestamp: 1767139200,
  },
]

function createAdapter(
  stateOverrides: Partial<BridgingWidgetAdapterState> = {},
  actionOverrides: Partial<BridgingWidgetAdapterActions> = {},
): BridgingWidgetAdapterResult {
  // Default to a fully connected, route-selected, ready-to-bridge state so
  // most fixtures only need to override the one field their state is about.
  const baseState: BridgingWidgetAdapterState = {
    isConnected: true,
    address: DEMO_ADDRESS,
    chainId: BRIDGING_CHAINS.FUSE,
    isWrongChain: false,
    targetChainId: BRIDGING_CHAINS.CELO,
    availableProtocols: ['LAYERZERO', 'AXELAR'],
    selectedProtocol: 'LAYERZERO',
    isRouteSupported: true,
    inputAmount: '50',
    bridgeConfig: sampleBridgeConfig,
    isBridgeConfigLoading: false,
    bridgeConfigError: null,
    quoteStatus: 'ready',
    quote: sampleQuote,
    needsApproval: false,
    canBridge: true,
    requirements: [],
    quoteError: null,
    isReviewOpen: false,
    submissionStep: 'idle',
    submissionFailedAtStep: null,
    submissionError: null,
    submissionTxHash: null,
    historyTransactions: sampleHistory,
    isHistoryLoading: false,
    historyError: null,
    isHistoryPartial: false,
    selectedHistoryTransaction: null,
    selectedHistoryExplorerLink: null,
  }

  const actions: BridgingWidgetAdapterActions = {
    connect: async () => {},
    switchChain: async () => {},
    selectTargetChain: () => {},
    selectProtocol: () => {},
    setInputAmount: () => {},
    setMaxAmount: () => {},
    openReview: () => {},
    closeReview: () => {},
    confirmBridge: () => {},
    retrySubmission: () => {},
    closeSubmission: () => {},
    refreshHistory: () => {},
    viewHistoryTransaction: () => {},
    closeHistoryTransaction: () => {},
    ...actionOverrides,
  }

  return {
    state: { ...baseState, ...stateOverrides },
    actions,
  }
}

// MiniAppShell must sit inside a provider: without one it first paints before any
// Tamagui theme is registered, and the theme that the widget's own provider registers
// then flips its internal Theme hook path on the next re-render ("Should have a queue").
function StoryShell({ children, dataTestId }: { children: React.ReactNode; dataTestId: string }) {
  return (
    <GoodWidgetProvider>
      <MiniAppShell>
        <YStack
          data-testid={dataTestId}
          style={{
            width: '100%',
            maxWidth: 400,
            minHeight: '100vh',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </YStack>
      </MiniAppShell>
    </GoodWidgetProvider>
  )
}

function PreviewStoryShell({
  adapter,
  dataTestId,
  initialTab = 'bridge',
  defaultTheme,
  themeOverrides,
}: {
  adapter: BridgingWidgetAdapterResult
  dataTestId: string
  initialTab?: BridgingWidgetTab
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: BridgingWidgetProps['themeOverrides']
}) {
  return (
    <StoryShell dataTestId={dataTestId}>
      <BridgingWidgetPreview
        adapter={adapter}
        initialTab={initialTab}
        defaultTheme={defaultTheme}
        themeOverrides={themeOverrides}
      />
    </StoryShell>
  )
}

function BridgingWidgetStoryShell({
  provider,
  dataTestId,
  defaultTheme,
  themeOverrides,
}: {
  provider: unknown
  dataTestId: string
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: BridgingWidgetProps['themeOverrides']
}) {
  return (
    <StoryShell dataTestId={dataTestId}>
      <BridgingWidget
        provider={provider}
        defaultTheme={defaultTheme}
        themeOverrides={themeOverrides}
      />
    </StoryShell>
  )
}

export function InjectedWalletStory({
  defaultTheme,
  themeOverrides,
}: Pick<BridgingWidgetProps, 'defaultTheme' | 'themeOverrides'>) {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)

  if (!usableProvider) {
    return (
      <PreviewStoryShell
        adapter={createAdapter({
          isConnected: false,
          address: null,
          chainId: null,
          targetChainId: null,
          availableProtocols: [],
          selectedProtocol: null,
          isRouteSupported: false,
          bridgeConfig: null,
          quote: null,
          historyTransactions: [],
        })}
        dataTestId="BridgingWidget-no-injected-wallet"
        defaultTheme={defaultTheme}
        themeOverrides={themeOverrides}
      />
    )
  }

  return (
    <BridgingWidgetStoryShell
      provider={injectedProvider}
      dataTestId="BridgingWidget-injected-wallet"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function CustodialLocalFixtureStory({
  defaultTheme,
  themeOverrides,
}: Pick<BridgingWidgetProps, 'defaultTheme' | 'themeOverrides'>) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <BridgingWidgetStoryShell
        provider={provider}
        dataTestId="BridgingWidget-custodial-wallet"
        defaultTheme={defaultTheme}
        themeOverrides={themeOverrides}
      />
    )
  } catch (error: unknown) {
    return (
      <YStack
        data-testid="BridgingWidget-custodial-config-error"
        style={{ width: 'min(400px, 100vw)' }}
      >
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

type ThemeArgs = {
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: BridgingWidgetProps['themeOverrides']
}

export function NoWalletStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        isConnected: false,
        address: null,
        chainId: null,
        targetChainId: null,
        availableProtocols: [],
        selectedProtocol: null,
        isRouteSupported: false,
        bridgeConfig: null,
        quote: null,
        historyTransactions: [],
      })}
      dataTestId="BridgingWidget-no-wallet"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function WrongChainStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        chainId: 1,
        isWrongChain: true,
      })}
      dataTestId="BridgingWidget-wrong-chain"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function RouteNotSupportedStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        targetChainId: BRIDGING_CHAINS.FUSE,
        availableProtocols: [],
        selectedProtocol: null,
        isRouteSupported: false,
        bridgeConfig: null,
        quote: null,
        quoteStatus: 'idle',
      })}
      dataTestId="BridgingWidget-route-not-supported"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function ConfigLoadingStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        bridgeConfig: null,
        isBridgeConfigLoading: true,
        quote: null,
        quoteStatus: 'idle',
      })}
      dataTestId="BridgingWidget-config-loading"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function ConfigErrorStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        bridgeConfig: null,
        bridgeConfigError: 'Unable to load balance and limits.',
        quote: null,
        quoteStatus: 'idle',
      })}
      dataTestId="BridgingWidget-config-error"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function QuoteLoadingStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        quoteStatus: 'loading',
        quote: null,
        canBridge: false,
      })}
      dataTestId="BridgingWidget-quote-loading"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function QuoteErrorStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        quoteStatus: 'error',
        quote: null,
        canBridge: false,
        quoteError: 'Unable to fetch a quote for this route right now.',
      })}
      dataTestId="BridgingWidget-quote-error"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function BelowMinAmountStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        inputAmount: '0.1',
        quote: null,
        canBridge: false,
        requirements: [{ type: 'below_min_amount', message: 'Minimum bridge amount is 1 G$.' }],
      })}
      dataTestId="BridgingWidget-below-min-amount"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function InsufficientBalanceStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        inputAmount: '10000',
        quote: null,
        canBridge: false,
        requirements: [
          { type: 'insufficient_token_balance', message: 'Your G$ balance is too low for this amount.' },
        ],
      })}
      dataTestId="BridgingWidget-insufficient-balance"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function NeedsApprovalStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        needsApproval: true,
        canBridge: true,
      })}
      dataTestId="BridgingWidget-needs-approval"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function ReadyToBridgeStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter()}
      dataTestId="BridgingWidget-ready-to-bridge"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function ReviewOpenStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({ isReviewOpen: true })}
      dataTestId="BridgingWidget-review-open"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function SubmissionApprovingStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({ needsApproval: true, submissionStep: 'approving' })}
      dataTestId="BridgingWidget-submission-approving"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function SubmissionBridgingStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({ submissionStep: 'bridging' })}
      dataTestId="BridgingWidget-submission-bridging"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function SubmissionCompletedStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        submissionStep: 'completed',
        submissionTxHash: SAMPLE_COMPLETED_SRC_HASH,
      })}
      dataTestId="BridgingWidget-submission-completed"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function SubmissionFailedApprovingStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        needsApproval: true,
        submissionStep: 'failed',
        submissionFailedAtStep: 'approving',
        submissionError: 'You rejected the approval request.',
      })}
      dataTestId="BridgingWidget-submission-failed-approving"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function SubmissionFailedBridgingStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        submissionStep: 'failed',
        submissionFailedAtStep: 'bridging',
        submissionError: 'The bridge transaction reverted on-chain.',
      })}
      dataTestId="BridgingWidget-submission-failed-bridging"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function HistoryLoadingStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({ historyTransactions: [], isHistoryLoading: true })}
      dataTestId="BridgingWidget-history-loading"
      initialTab="history"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function HistoryEmptyStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({ historyTransactions: [] })}
      dataTestId="BridgingWidget-history-empty"
      initialTab="history"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function HistoryErrorStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        historyTransactions: [],
        historyError: 'Unable to load bridge history.',
      })}
      dataTestId="BridgingWidget-history-error"
      initialTab="history"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function HistoryPopulatedStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter()}
      dataTestId="BridgingWidget-history-populated"
      initialTab="history"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function HistoryDetailModalOpenStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        selectedHistoryTransaction: sampleHistory[0],
        selectedHistoryExplorerLink: 'https://layerzeroscan.com/tx/' + SAMPLE_COMPLETED_SRC_HASH,
      })}
      dataTestId="BridgingWidget-history-detail-modal-open"
      initialTab="history"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function FaqTabStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  return (
    <PreviewStoryShell
      adapter={createAdapter()}
      dataTestId="BridgingWidget-faq-tab"
      initialTab="faq"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function LightThemePopulatedStory({ themeOverrides }: Pick<ThemeArgs, 'themeOverrides'> = {}) {
  return (
    <GoodWidgetProvider defaultTheme="light">
      <PreviewStoryShell
        adapter={createAdapter()}
        dataTestId="BridgingWidget-light-theme-populated"
        defaultTheme="light"
        themeOverrides={themeOverrides}
      />
    </GoodWidgetProvider>
  )
}

export function FuseSourceStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  // Fuse (122) has 2 decimals: 500 G$ = 50000n, input 100 G$ = 10000n
  const fuseDecimals = 2
  const G$Fuse = (whole: number) => BigInt(whole) * 10n ** BigInt(fuseDecimals)

  const fuseBridgeConfig: BridgeConfig = {
    ...sampleBridgeConfig,
    currentChainId: BRIDGING_CHAINS.FUSE,
    tokenBalance: G$Fuse(500), // 50000n (500 G$)
    routeLimits: {
      minAmount: G$Fuse(1), // 100n (1 G$)
      dailyLimit: G$Fuse(1000000),
      txLimit: G$Fuse(300000000),
      accountDailyLimit: G$Fuse(50000),
      onlyWhitelisted: false,
    },
    routeLimitsChainId: BRIDGING_CHAINS.FUSE,
  }

  // 100 G$ transferred from Fuse (2 decimals) to Celo (18 decimals)
  // Protocol fee: 0.25 G$ (in Celo 18 decimals) = 250000000000000000n
  // Amount received: 99.75 G$ (in Celo 18 decimals) = 99750000000000000000n
  const fuseSourceQuote: BridgeFeeQuote = {
    fee: 120000000000000n,
    feeInNative: '0.00012',
    protocol: 'LAYERZERO',
    target: DEMO_ADDRESS,
    targetChainId: BRIDGING_CHAINS.CELO,
    amount: G$Fuse(100), // 10000n
    protocolFeeBps: 25n,
    protocolFee: 250000000000000000n,
    amountReceived: 99750000000000000000n,
  }

  return (
    <PreviewStoryShell
      adapter={createAdapter({
        chainId: BRIDGING_CHAINS.FUSE,
        targetChainId: BRIDGING_CHAINS.CELO,
        inputAmount: '100',
        bridgeConfig: fuseBridgeConfig,
        quote: fuseSourceQuote,
        canBridge: true,
      })}
      dataTestId="BridgingWidget-fuse-source"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function FuseDestinationStory({ defaultTheme, themeOverrides }: ThemeArgs = {}) {
  // Celo (42220) has 18 decimals -> Fuse (122) has 2 decimals
  const celoDecimals = 18
  const G$Celo = (whole: number) => BigInt(whole) * 10n ** BigInt(celoDecimals)

  const celoBridgeConfig: BridgeConfig = {
    ...sampleBridgeConfig,
    currentChainId: BRIDGING_CHAINS.CELO,
    tokenBalance: G$Celo(500),
    routeLimits: {
      minAmount: G$Celo(1),
      dailyLimit: G$Celo(1000000),
      txLimit: G$Celo(300000000),
      accountDailyLimit: G$Celo(50000),
      onlyWhitelisted: false,
    },
    routeLimitsChainId: BRIDGING_CHAINS.CELO,
  }

  // 100 G$ from Celo (18 decimals) to Fuse (2 decimals)
  // Protocol fee: 0.25 G$ (in Fuse 2 decimals) = 25n
  // Amount received: 99.75 G$ (in Fuse 2 decimals) = 9975n
  const fuseDestinationQuote: BridgeFeeQuote = {
    fee: 120000000000000n,
    feeInNative: '0.00012',
    protocol: 'LAYERZERO',
    target: DEMO_ADDRESS,
    targetChainId: BRIDGING_CHAINS.FUSE,
    amount: G$Celo(100),
    protocolFeeBps: 25n,
    protocolFee: 25n,
    amountReceived: 9975n,
  }

  return (
    <PreviewStoryShell
      adapter={createAdapter({
        chainId: BRIDGING_CHAINS.CELO,
        targetChainId: BRIDGING_CHAINS.FUSE,
        inputAmount: '100',
        bridgeConfig: celoBridgeConfig,
        quote: fuseDestinationQuote,
        canBridge: true,
      })}
      dataTestId="BridgingWidget-fuse-destination"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

