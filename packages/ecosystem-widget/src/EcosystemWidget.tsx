import React, { lazy, Suspense, useMemo, useState } from 'react'
import { GoodWidgetProvider, useWallet, WalletControls } from '@goodwidget/core'
import type { GoodWidgetProviderProps } from '@goodwidget/core'
import type { CitizenClaimWidgetProps } from '@goodwidget/citizen-claim-widget'
import type { ReserveSwapWidgetProps } from '@goodwidget/goodreserve-widget'
import type { StreamingWidgetProps } from '@goodwidget/streaming-widget'
import type { AiCreditsWidgetProps } from '@goodwidget/ai-credits-widget'
import {
  BottomAppBar, BottomBarItem, Coins, EcosystemHeader, HandCoins, MoreHorizontal,
  Sparkles, Text, Waves, WidgetDrawer, WidgetListRow, WidgetUnavailable, WidgetVersion, YStack,
} from '@goodwidget/ui'
import { version } from '../package.json'

const Claim = lazy(() => import('@goodwidget/citizen-claim-widget').then((m) => ({ default: m.CitizenClaimWidget })))
const Reserve = lazy(() => import('@goodwidget/goodreserve-widget').then((m) => ({ default: m.GoodReserveWidget })))
const Streaming = lazy(() => import('@goodwidget/streaming-widget').then((m) => ({ default: m.StreamingWidget })))
const AiCredits = lazy(() => import('@goodwidget/ai-credits-widget').then((m) => ({ default: m.AiCreditsWidget })))

export type EcosystemWidgetId = 'citizen-claim' | 'goodreserve' | 'streaming' | 'ai-credits'

const definitions: Record<EcosystemWidgetId, {
  label: string
  description: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  chains: number[]
}> = {
  'citizen-claim': { label: 'Claim', description: 'Claim your daily G$ UBI', icon: HandCoins, chains: [42220, 122, 50] },
  goodreserve: { label: 'Reserve', description: 'Swap through the GoodReserve', icon: Coins, chains: [42220, 50] },
  streaming: { label: 'Streaming', description: 'Streams, pools and balances', icon: Waves, chains: [42220, 8453] },
  'ai-credits': { label: 'AI Credits', description: 'Buy AI coding credits with G$', icon: Sparkles, chains: [42220] },
}

type SharedKeys = 'provider' | 'config' | 'themeOverrides' | 'defaultTheme' | 'addressOverride'
  | 'chainIdOverride' | 'connectOverride' | 'switchChainOverride' | 'availableChainIdsOverride'
  | 'hideHeader' | 'showWalletControls'

export interface EcosystemWidgetProps extends Omit<GoodWidgetProviderProps, 'children'> {
  widgets?: EcosystemWidgetId[]
  nativeMode?: boolean
  supportedChains?: Partial<Record<EcosystemWidgetId, number[]>>
  widgetProps?: {
    'citizen-claim'?: Omit<CitizenClaimWidgetProps, SharedKeys>
    goodreserve?: Omit<ReserveSwapWidgetProps, SharedKeys>
    streaming?: Omit<StreamingWidgetProps, SharedKeys>
    'ai-credits'?: Omit<AiCreditsWidgetProps, SharedKeys>
  }
}

class WidgetLoadBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <Text>Unable to load this widget. Please try again later.</Text> : this.props.children
  }
}

function Shell({ widgets = [], nativeMode = false, supportedChains, widgetProps, ...host }: EcosystemWidgetProps) {
  const wallet = useWallet()
  const [selected, setSelected] = useState<EcosystemWidgetId | undefined>(widgets[0])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enabled = Array.from(new Set(widgets.filter((id) => Object.hasOwn(definitions, id))))
  const current = selected && enabled.includes(selected) ? selected : enabled[0]
  const definition = current ? definitions[current] : null
  const chainChoices = current
    ? definitions[current].chains.filter((id) => !supportedChains?.[current] || supportedChains[current]!.includes(id))
    : []
  const executableChains = chainChoices.filter((id) => !wallet.availableChainIds || wallet.availableChainIds.includes(id))
  const canUseChain = wallet.chainId != null && executableChains.includes(wallet.chainId)
  const switchTarget = executableChains[0]
  const claimProps = widgetProps?.['citizen-claim']
  const custodialExecution = claimProps?.claimExecution
  const isCustodialClaim = current === 'citizen-claim' && custodialExecution?.mode === 'custodial'
  const claimChainKey = chainChoices.join(',')
  const scopedClaimExecution = useMemo(() => {
    if (!custodialExecution) return undefined
    const allowed = new Set(claimChainKey.split(',').filter(Boolean).map(Number))
    return {
      ...custodialExecution,
      clientsByChain: Object.fromEntries(
        Object.entries(custodialExecution.clientsByChain).filter(([id]) => allowed.has(Number(id))),
      ),
    }
  }, [custodialExecution, claimChainKey])
  const scopedClientFactory = useMemo(() => {
    const factory = claimProps?.clientFactory
    if (!factory || !isCustodialClaim) return factory
    const allowed = new Set(claimChainKey.split(',').filter(Boolean).map(Number))
    return (input: Parameters<typeof factory>[0]) => {
      if (!allowed.has(input.chainId)) {
        throw new Error(`CitizenClaimWidget: chain ${input.chainId} is not supported by this wrapper`)
      }
      return factory(input)
    }
  }, [claimProps?.clientFactory, isCustodialClaim, claimChainKey])
  const shared = {
    provider: wallet.provider ?? undefined,
    addressOverride: wallet.address,
    chainIdOverride: wallet.chainId,
    connectOverride: wallet.connect,
    switchChainOverride: host.switchChainOverride,
    availableChainIdsOverride: executableChains,
    config: host.config,
    themeOverrides: host.themeOverrides,
    defaultTheme: host.defaultTheme,
    hideHeader: true,
  }
  const select = (id: EcosystemWidgetId) => {
    setError(null)
    setSelected(id)
    setDrawerOpen(false)
  }
  const connect = async () => {
    setConnecting(true)
    setError(null)
    try { await wallet.connect() } catch (e) { setError(e instanceof Error ? e.message : 'Unable to connect wallet.') }
    finally { setConnecting(false) }
  }
  const switchNetwork = async () => {
    if (switchTarget == null) return
    setError(null)
    try { await wallet.switchChain(switchTarget) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to switch network.') }
  }

  return (
    <YStack width="100%" flex={1} minHeight={500} backgroundColor="$background">
      <EcosystemHeader
        address={wallet.address}
        chainId={wallet.chainId ?? undefined}
        hideConnect={nativeMode}
        onConnect={nativeMode ? undefined : () => { void connect() }}
        connecting={connecting}
        walletControls={wallet.address && !nativeMode ? <WalletControls size="sm" /> : undefined}
      />
      <YStack flex={1} width="100%" padding="$4" gap="$3">
        {error && <Text color="$error">{error}</Text>}
        {!current ? <Text>No widgets are enabled.</Text> : !wallet.isConnected ? (
          <Text>{nativeMode ? 'Waiting for the host wallet.' : 'Connect your wallet to continue.'}</Text>
        ) : !isCustodialClaim && wallet.chainId == null ? (
          <Text>Waiting for the wallet network.</Text>
        ) : !isCustodialClaim && !canUseChain && definition ? (
          <WidgetUnavailable widgetName={definition.label} networkName={`chain ${wallet.chainId}`} onSwitchNetwork={switchTarget == null ? undefined : () => { void switchNetwork() }} />
        ) : (
          <WidgetLoadBoundary key={current}>
            <Suspense fallback={<Text>Loading {definition?.label}…</Text>}>
              {current === 'citizen-claim' && (
                <Claim
                  // Claim's adapter loads its chain-bound reads on mount.
                  key={isCustodialClaim ? claimChainKey : undefined}
                  {...claimProps}
                  {...shared}
                  claimExecution={isCustodialClaim ? scopedClaimExecution : claimProps?.claimExecution}
                  clientFactory={isCustodialClaim ? scopedClientFactory : claimProps?.clientFactory}
                />
              )}
              {current === 'goodreserve' && <Reserve {...widgetProps?.goodreserve} {...shared} />}
              {current === 'streaming' && <Streaming {...widgetProps?.streaming} {...shared} />}
              {current === 'ai-credits' && <AiCredits {...widgetProps?.['ai-credits']} {...shared} showWalletControls={false} />}
            </Suspense>
          </WidgetLoadBoundary>
        )}
      </YStack>
      {enabled.length > 1 && (
        <BottomAppBar>
          {enabled.slice(0, 4).map((id) => {
            const { label, icon: Glyph } = definitions[id]
            return <BottomBarItem key={id} label={label} icon={<Glyph size={24} color={current === id ? '$color' : '$placeholderColor'} />} active={current === id} onPress={() => select(id)} />
          })}
          <BottomBarItem label="More" icon={<MoreHorizontal size={24} color="$placeholderColor" />} disabled={enabled.length <= 4} onPress={() => setDrawerOpen(true)} />
        </BottomAppBar>
      )}
      <WidgetDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {enabled.map((id) => {
          const { label, description, icon: Glyph } = definitions[id]
          return <WidgetListRow key={id} label={label} description={description} icon={<Glyph size={24} color="$color" />} active={id === current} onPress={() => select(id)} />
        })}
      </WidgetDrawer>
      <WidgetVersion name="Ecosystem" version={version} />
    </YStack>
  )
}

export function EcosystemWidget(props: EcosystemWidgetProps) {
  return (
    <GoodWidgetProvider {...props}>
      <Shell {...props} />
    </GoodWidgetProvider>
  )
}
