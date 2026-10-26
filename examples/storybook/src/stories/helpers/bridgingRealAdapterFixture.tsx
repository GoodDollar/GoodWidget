import React, { useEffect, useMemo, useState } from 'react'
import { formatUnits, parseUnits, type Address, type TransactionReceipt } from 'viem'
import { BridgingSDK, type BridgeRequestEvent } from '@goodsdks/bridging-sdk'
// The published widget bundle includes its own SDK copy. Importing the widget
// source here lets this QA-only mock patch the same SDK class the real adapter uses.
import { BridgingWidget } from '../../../../../packages/bridging-widget/src/BridgingWidget'
import { BRIDGING_CHAINS, type BridgingWidgetProps } from '../../../../../packages/bridging-widget/src/widgetRuntimeContract'

const ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address
const HASH = '0x3333333333333333333333333333333333333333333333333333333333333333' as const
const DESTINATION_HASH = '0x4444444444444444444444444444444444444444444444444444444444444444' as const

type FixtureMode = 'submit' | 'history'
type FixtureEvent = { kind: string; [key: string]: string | number | boolean }

interface FixtureControls {
  events: FixtureEvent[]
  holdNextSwitch: () => void
  releaseSwitch: () => void
  holdNextFreshQuote: () => void
  releaseFreshQuote: () => void
  failNextFreshQuoteWithRevert: () => void
  holdBridge: () => void
  releaseBridge: () => void
  failNextBridgeWithRevert: () => void
  setAccount: (address: Address | null) => void
  failNextHistoryRefresh: () => void
  markDelivered: () => void
}

declare global {
  interface Window {
    __bridgingWidgetFixture?: FixtureControls
  }
}

function decimals(chainId: number): number {
  return chainId === BRIDGING_CHAINS.FUSE || chainId === BRIDGING_CHAINS.ETHEREUM ? 2 : 18
}

function createFixture(mode: FixtureMode) {
  const events: FixtureEvent[] = []
  const listeners = new Map<string, Set<(value: unknown) => void>>()
  let account: Address | null = ADDRESS
  let walletChainId: number = BRIDGING_CHAINS.CELO
  let blockSwitch = false
  let releaseSwitch: (() => void) | null = null
  let blockFreshQuote = false
  let releaseFreshQuote: (() => void) | null = null
  let failFreshQuoteWithRevert = false
  let blockBridge = false
  let releaseBridge: (() => void) | null = null
  let failBridgeWithRevert = false
  let failNextScan = false
  let delivered = false
  let freshQuote: Awaited<ReturnType<BridgingSDK['getQuote']>>['quote'] = null

  const emit = (event: string, value: unknown) => {
    for (const listener of listeners.get(event) ?? []) listener(value)
  }

  const controls: FixtureControls = {
    events,
    holdNextSwitch: () => { blockSwitch = true },
    releaseSwitch: () => { releaseSwitch?.() },
    holdNextFreshQuote: () => { blockFreshQuote = true },
    releaseFreshQuote: () => { releaseFreshQuote?.() },
    failNextFreshQuoteWithRevert: () => { failFreshQuoteWithRevert = true },
    holdBridge: () => { blockBridge = true },
    releaseBridge: () => { releaseBridge?.() },
    failNextBridgeWithRevert: () => { failBridgeWithRevert = true },
    setAccount: (next) => {
      account = next
      events.push({ kind: 'account', address: next ?? '' })
      emit('accountsChanged', next ? [next] : [])
    },
    failNextHistoryRefresh: () => { failNextScan = true },
    markDelivered: () => { delivered = true },
  }

  const provider = {
    on(event: string, listener: (value: unknown) => void) {
      const bucket = listeners.get(event) ?? new Set<(value: unknown) => void>()
      bucket.add(listener)
      listeners.set(event, bucket)
    },
    removeListener(event: string, listener: (value: unknown) => void) {
      listeners.get(event)?.delete(listener)
    },
    async request({ method, params }: { method: string; params?: [{ chainId: string }] }): Promise<unknown> {
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return account ? [account] : []
      if (method === 'eth_chainId') return `0x${walletChainId.toString(16)}`
      if (method === 'wallet_switchEthereumChain') {
        const nextChainId = parseInt(params?.[0].chainId ?? '0x0', 16)
        events.push({ kind: 'switch', chainId: nextChainId })
        if (blockSwitch) {
          await new Promise<void>((resolve) => { releaseSwitch = resolve })
          releaseSwitch = null
          blockSwitch = false
        }
        walletChainId = nextChainId
        emit('chainChanged', `0x${walletChainId.toString(16)}`)
        events.push({ kind: 'switch-resolved', chainId: nextChainId })
        return null
      }
      throw new Error(`Mock wallet does not support ${method}`)
    },
  }

  const pendingEvent: BridgeRequestEvent = {
    transactionHash: HASH,
    blockNumber: 1n,
    timestamp: 1767225600,
    address: ADDRESS,
    chainId: BRIDGING_CHAINS.FUSE,
    args: {
      from: ADDRESS,
      to: ADDRESS,
      amount: 10000n,
      targetChainId: BRIDGING_CHAINS.CELO,
      timestamp: 1767225600n,
      bridge: 'LAYERZERO',
      id: 1n,
    },
  }

  const installSdkMock = () => {
    const originals = {
      getBridgeConfig: BridgingSDK.prototype.getBridgeConfig,
      getQuote: BridgingSDK.prototype.getQuote,
      doBridge: BridgingSDK.prototype.doBridge,
      getCombinedHistory: BridgingSDK.prototype.getCombinedHistory,
      getTransactionStatus: BridgingSDK.prototype.getTransactionStatus,
    }

    BridgingSDK.prototype.getBridgeConfig = async (_address, route) => {
      const source = route?.fromChain ?? BRIDGING_CHAINS.CELO
      const unit = 10n ** BigInt(decimals(source))
      const normalizedUnit = 10n ** 18n
      return {
        supportedChains: {},
        currentChainId: source,
        tokenBalance: 500n * unit,
        nativeBalance: 10n ** 18n,
        allowance: 500n * unit,
        fees: null,
        routeLimits: {
          minAmount: normalizedUnit,
          dailyLimit: 1000000n * normalizedUnit,
          txLimit: 300000000n * normalizedUnit,
          accountDailyLimit: 50000n * normalizedUnit,
          onlyWhitelisted: false,
        },
        routeLimitsChainId: source,
        protocolFeeBps: 25n,
        protocolFeeChainId: route?.toChain ?? null,
      }
    }

    BridgingSDK.prototype.getQuote = async (params) => {
      events.push({
        kind: 'quote',
        refresh: params.refresh === true,
        sender: params.sender,
        fromChain: params.fromChain,
        toChain: params.toChain,
        amount: params.amount.toString(),
      })
      if (params.refresh && blockFreshQuote) {
        await new Promise<void>((resolve) => { releaseFreshQuote = resolve })
        releaseFreshQuote = null
        blockFreshQuote = false
      }
      if (params.refresh && failFreshQuoteWithRevert) {
        failFreshQuoteWithRevert = false
        throw new Error('The contract function "bridgeLimits" reverted: Internal error')
      }
      const destinationAmount = parseUnits(
        formatUnits(params.amount, decimals(params.fromChain)),
        decimals(params.toChain),
      )
      const protocolFee = destinationAmount / 400n
      const quote = {
        fee: 132000000000000n,
        feeInNative: '0.00012 FUSE',
        protocol: params.protocol,
        target: params.recipient ?? params.sender,
        targetChainId: params.toChain,
        amount: params.amount,
        protocolFeeBps: 25n,
        protocolFee,
        amountReceived: destinationAmount - protocolFee,
      }
      if (params.refresh) freshQuote = quote
      events.push({ kind: 'quote-returned', refresh: params.refresh === true })
      return { quote, needsApproval: false, canBridge: true, requirements: [] }
    }

    BridgingSDK.prototype.doBridge = async (quote, onStatus) => {
      events.push({
        kind: 'doBridge',
        receivedFreshQuote: quote === freshQuote,
        amount: quote.amount.toString(),
        targetChainId: quote.targetChainId,
      })
      onStatus?.({ step: 'bridging' })
      if (failBridgeWithRevert) {
        failBridgeWithRevert = false
        throw new Error('Execution reverted: sensitive RPC details')
      }
      if (blockBridge) {
        await new Promise<void>((resolve) => { releaseBridge = resolve })
        releaseBridge = null
        blockBridge = false
      }
      // The adapter only reads transactionHash; no chain receipt is produced by this fixture.
      const receipt = { transactionHash: HASH } as unknown as TransactionReceipt
      onStatus?.({ step: 'completed', bridgeTxHash: HASH, receipt })
      events.push({ kind: 'bridge-complete' })
      return receipt
    }

    BridgingSDK.prototype.getCombinedHistory = async () => {
      events.push({ kind: 'history-scan' })
      if (failNextScan) {
        failNextScan = false
        throw new Error('Mock refresh failure')
      }
      return mode === 'history' ? [pendingEvent] : []
    }

    BridgingSDK.prototype.getTransactionStatus = async () => {
      events.push({ kind: 'history-status', delivered })
      return delivered
        ? { status: 'completed' as const, srcTxHash: HASH, dstTxHash: DESTINATION_HASH }
        : { status: 'pending' as const, srcTxHash: HASH }
    }

    return () => {
      BridgingSDK.prototype.getBridgeConfig = originals.getBridgeConfig
      BridgingSDK.prototype.getQuote = originals.getQuote
      BridgingSDK.prototype.doBridge = originals.doBridge
      BridgingSDK.prototype.getCombinedHistory = originals.getCombinedHistory
      BridgingSDK.prototype.getTransactionStatus = originals.getTransactionStatus
    }
  }

  return { controls, provider, installSdkMock }
}

export function BridgingRealAdapterFixture({
  mode,
  defaultTheme,
  themeOverrides,
}: Pick<BridgingWidgetProps, 'defaultTheme' | 'themeOverrides'> & { mode: FixtureMode }) {
  const fixture = useMemo(() => createFixture(mode), [mode])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const restore = fixture.installSdkMock()
    window.__bridgingWidgetFixture = fixture.controls
    setReady(true)
    return () => {
      restore()
      delete window.__bridgingWidgetFixture
    }
  }, [fixture])

  return (
    <div data-testid="BridgingWidget-real-adapter" style={{ maxWidth: 420 }}>
      {ready && <BridgingWidget provider={fixture.provider} defaultTheme={defaultTheme} themeOverrides={themeOverrides} />}
    </div>
  )
}
