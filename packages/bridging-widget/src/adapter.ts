import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useWallet } from '@goodwidget/core'
import type { BridgeProtocol, BridgeTransaction } from '@goodsdks/bridging-sdk'
import type { Address } from 'viem'
import type {
  BridgingWidgetAdapterActions,
  BridgingWidgetAdapterResult,
  BridgingWidgetAdapterState,
} from './widgetRuntimeContract'
import { getRouteProtocols } from './adapter/bridgeRoutes'
import { useBridgingPublicClients, useBridgingSdk } from './adapter/bridgingClient'
import { isBridgingChain, getChainDecimals } from './adapter/chains'
import { primaryRequirementMessage } from './adapter/errors'
import { BRIDGING_CHAINS } from './widgetRuntimeContract'
import { sanitizeAmount } from './amount'
import { useBridgeConfig } from './adapter/useBridgeConfig'
import { useBridgeHistory } from './adapter/useBridgeHistory'
import { useBridgeQuote } from './adapter/useBridgeQuote'
import { useBridgeSubmission } from './adapter/useBridgeSubmission'

export function useBridgingAdapter(): BridgingWidgetAdapterResult {
  const { address, chainId, isConnected, provider, connect, switchChain } = useWallet()
  const walletAddress = (address as Address | null) ?? null
  const [selectedSourceChainId, setSelectedSourceChainId] = useState<number | null>(null)
  const activeChainId = selectedSourceChainId ?? (isBridgingChain(chainId) ? chainId! : BRIDGING_CHAINS.CELO)
  const isWrongChain = isConnected && !isBridgingChain(chainId ?? null)
  const submissionIdentityRef = useRef({ walletAddress, activeChainId })
  submissionIdentityRef.current = { walletAddress, activeChainId }

  const [targetChainId, setTargetChainId] = useState<number | null>(null)
  const [selectedProtocol, setSelectedProtocol] = useState<BridgeProtocol | null>(null)
  const [inputAmount, setInputAmountRaw] = useState('')
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [selectedHistoryTransaction, setSelectedHistoryTransaction] = useState<BridgeTransaction | null>(null)

  const publicClients = useBridgingPublicClients()
  const sdk = useBridgingSdk({ provider, chainId: activeChainId })
  const submission = useBridgeSubmission({ sdk })
  const history = useBridgeHistory({ sdk, address: walletAddress, publicClients })

  const selectSourceChain = useCallback((nextChainId: number) => {
    if (!isBridgingChain(nextChainId)) return
    if (nextChainId !== activeChainId) submission.cancelPreparation()
    setSelectedSourceChainId(nextChainId)
  }, [activeChainId, submission.cancelPreparation])

  // Route and amount belong to the selected account and source chain. Keep
  // an in-flight transaction visible if either changes while it settles.
  useEffect(() => {
    setTargetChainId(null)
    setSelectedProtocol(null)
    setInputAmountRaw('')
    setIsReviewOpen(false)
    setSelectedHistoryTransaction(null)
    submission.cancelPreparation()
    if (submission.step === 'failed') submission.reset()
  }, [walletAddress, activeChainId])

  // Clear a typed amount when the destination chain changes: a route's
  // limits/balance are route-specific, so an amount valid for the old route
  // could silently violate the new one if left in place.
  useEffect(() => {
    setInputAmountRaw('')
    setIsReviewOpen(false)
    submission.cancelPreparation()
    if (submission.step === 'failed') submission.reset()
  }, [targetChainId])

  const availableProtocols = useMemo(() => {
    if (activeChainId === null || targetChainId === null) return []
    return getRouteProtocols(activeChainId, targetChainId)
  }, [activeChainId, targetChainId])

  // Keep the selected protocol in sync with the route's actual options: default
  // to the first one when a route becomes available, and drop a selection that
  // the current route no longer supports (e.g. target changed to a Fuse/XDC leg).
  useEffect(() => {
    if (availableProtocols.length === 0) {
      setSelectedProtocol(null)
      return
    }

    setSelectedProtocol((current) =>
      current && availableProtocols.includes(current) ? current : availableProtocols[0],
    )
  }, [availableProtocols])

  const selectTargetChain = useCallback((nextChainId: number) => {
    setTargetChainId(nextChainId)
  }, [])

  const selectProtocol = useCallback((protocol: BridgeProtocol) => {
    setSelectedProtocol(protocol)
    setIsReviewOpen(false)
  }, [])

  const bridgeConfigState = useBridgeConfig({
    sdk,
    address: walletAddress,
    fromChain: activeChainId,
    toChain: targetChainId,
    protocol: selectedProtocol,
  })

  const quoteState = useBridgeQuote({
    sdk,
    sender: walletAddress,
    fromChain: activeChainId,
    toChain: targetChainId,
    protocol: selectedProtocol,
    inputAmount,
  })

  const setInputAmount = useCallback((amount: string) => {
    setInputAmountRaw(sanitizeAmount(amount))
    setIsReviewOpen(false)
  }, [])

  const setMaxAmount = useCallback(() => {
    const balance = bridgeConfigState.config?.tokenBalance
    if (balance === undefined || activeChainId === null) return
    const decimals = getChainDecimals(activeChainId)
    setInputAmountRaw(formatUnits(balance, decimals))
  }, [bridgeConfigState.config, activeChainId])

  const openReview = useCallback(() => {
    if (quoteState.status !== 'ready' || !quoteState.canBridge || !quoteState.quote) return
    setIsReviewOpen(true)
  }, [quoteState.status, quoteState.canBridge, quoteState.quote])

  const closeReview = useCallback(() => setIsReviewOpen(false), [])

  const isSubmissionIdentityCurrent = useCallback(
    () => submissionIdentityRef.current.walletAddress === walletAddress &&
      submissionIdentityRef.current.activeChainId === activeChainId,
    [walletAddress, activeChainId],
  )

  const loadLatestQuote = useCallback(async () => {
    if (!sdk || !walletAddress || targetChainId === null || !selectedProtocol || !inputAmount) {
      throw new Error('Choose a route and amount before bridging.')
    }
    if (chainId !== activeChainId) {
      await switchChain(activeChainId)
      if (!isSubmissionIdentityCurrent()) throw new Error('Bridge preparation cancelled.')
    }
    const amount = parseUnits(inputAmount, getChainDecimals(activeChainId))
    const result = await sdk.getQuote({
      sender: walletAddress,
      amount,
      fromChain: activeChainId,
      toChain: targetChainId,
      protocol: selectedProtocol,
      refresh: true,
    })
    if (!isSubmissionIdentityCurrent()) throw new Error('Bridge preparation cancelled.')
    if (!result.canBridge || !result.quote) {
      throw new Error(primaryRequirementMessage(result.requirements) ?? 'Bridge quote is no longer valid.')
    }
    return result.quote
  }, [sdk, walletAddress, targetChainId, selectedProtocol, inputAmount, chainId, activeChainId, switchChain, isSubmissionIdentityCurrent])

  const confirmBridge = useCallback(() => {
    if (!isReviewOpen || quoteState.status !== 'ready' || !quoteState.canBridge) return
    setIsReviewOpen(false)
    void submission.submit(loadLatestQuote, isSubmissionIdentityCurrent)
  }, [isReviewOpen, quoteState.status, quoteState.canBridge, submission.submit, loadLatestQuote, isSubmissionIdentityCurrent])

  const retrySubmission = useCallback(() => {
    if (submission.step !== 'failed') return
    void submission.submit(loadLatestQuote, isSubmissionIdentityCurrent)
  }, [submission.step, submission.submit, loadLatestQuote, isSubmissionIdentityCurrent])

  const closeSubmission = useCallback(() => {
    const wasCompleted = submission.step === 'completed'
    submission.reset()
    // A completed bridge spent the typed amount, so clear it rather than
    // leaving a stale value that would re-trigger a quote for funds already sent.
    if (wasCompleted) setInputAmountRaw('')
    // The newly-submitted bridge is now on-chain; refresh so it shows up in
    // the History tab (as pending) without waiting for the next natural refetch.
    if (wasCompleted) history.refresh()
  }, [submission.step, submission.reset, history.refresh])

  const viewHistoryTransaction = useCallback((transaction: BridgeTransaction) => {
    setSelectedHistoryTransaction(transaction)
  }, [])

  const closeHistoryTransaction = useCallback(() => setSelectedHistoryTransaction(null), [])

  // Explorer links are protocol/chain-specific URL construction that only the
  // SDK instance knows how to build; the UI layer gets a ready-to-use string.
  const selectedHistoryExplorerLink = useMemo(() => {
    if (!sdk || !selectedHistoryTransaction) return null
    return sdk.getExplorerLink(selectedHistoryTransaction.hash, selectedHistoryTransaction.protocol)
  }, [sdk, selectedHistoryTransaction])

  const state: BridgingWidgetAdapterState = {
    isConnected,
    address: walletAddress,
    walletChainId: chainId ?? null,
    chainId: activeChainId,
    isWrongChain,
    targetChainId,
    availableProtocols,
    selectedProtocol,
    isRouteSupported: availableProtocols.length > 0,
    inputAmount,
    bridgeConfig: bridgeConfigState.config,
    isBridgeConfigLoading: bridgeConfigState.isLoading,
    bridgeConfigError: bridgeConfigState.error,
    quoteStatus: quoteState.status,
    quote: quoteState.quote,
    needsApproval: quoteState.needsApproval,
    canBridge: quoteState.canBridge,
    requirements: quoteState.requirements,
    quoteError: quoteState.error,
    isReviewOpen,
    submissionStep: submission.step,
    submissionFailedAtStep: submission.failedAtStep,
    submissionError: submission.error,
    submissionTxHash: submission.receipt?.transactionHash ?? null,
    historyTransactions: history.transactions,
    isHistoryLoading: history.isLoading,
    historyError: history.error,
    isHistoryPartial: history.isPartial,
    selectedHistoryTransaction,
    selectedHistoryExplorerLink,
  }

  const actions: BridgingWidgetAdapterActions = {
    connect,
    switchChain,
    selectSourceChain,
    selectTargetChain,
    selectProtocol,
    setInputAmount,
    setMaxAmount,
    openReview,
    closeReview,
    confirmBridge,
    retrySubmission,
    closeSubmission,
    refreshHistory: history.refresh,
    viewHistoryTransaction,
    closeHistoryTransaction,
  }

  return { state, actions }
}
