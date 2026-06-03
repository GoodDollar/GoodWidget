import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  http,
  parseAbi,
  type Address,
  type Chain,
} from 'viem'
import {
  FUSE_CHAIN_ID,
  FUSE_STAKING_CONTRACT_ADDRESS,
  type MigrationStep,
  type StakingMigrationErrorDetail,
  type StakingMigrationSuccessDetail,
  type StakingMigrationWidgetAdapterResult,
  type StakingMigrationWidgetConfig,
  type StakingMigrationWidgetState,
} from './widgetRuntimeContract'

// This is the migration step order expected by the widget timeline.
const MIGRATION_STEPS: MigrationStep[] = ['unstake', 'bridge sent', 'bridge received', 'stake']

// This ABI covers the ERC-20-style methods required for sG$ balance and approval flow.
const fuseStakingAbi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
])

// This chain descriptor keeps viem wallet/public clients aligned with Fuse mainnet.
const FUSE_CHAIN: Chain = {
  id: FUSE_CHAIN_ID,
  name: 'Fuse',
  nativeCurrency: {
    name: 'Fuse',
    symbol: 'FUSE',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.fuse.io'] },
    public: { http: ['https://rpc.fuse.io'] },
  },
}

const DEFAULT_STATE: StakingMigrationWidgetState = {
  status: 'summary',
  address: null,
  chainId: null,
  stakedAmount: '0',
  stakedAmountRaw: 0n,
  stakedTokenSymbol: 'sG$',
  hasRequiredConfig: false,
  isWrongNetwork: false,
  isBalanceLoading: false,
  completedSteps: [],
  activeStep: null,
  failedStep: null,
  approvalTxHash: null,
  migrationId: null,
  error: null,
}

interface ApiProgressPayload {
  migrationId: string | null
  status: 'migrating' | 'success' | 'error'
  completedSteps: MigrationStep[]
  activeStep: MigrationStep | null
  failedStep: MigrationStep | null
  reason: string | null
}

export interface UseStakingMigrationAdapterOptions {
  migrationConfig?: StakingMigrationWidgetConfig
  onMigrationSuccess?: (detail: StakingMigrationSuccessDetail) => void
  onMigrationError?: (detail: StakingMigrationErrorDetail) => void
}

function formatErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Unexpected migration error'
  const lowerMessage = error.message.toLowerCase()
  if (lowerMessage.includes('user rejected') || lowerMessage.includes('rejected the request')) {
    return 'Approval rejected in wallet'
  }
  return error.message
}

function normalizeStep(step: unknown): MigrationStep | null {
  if (typeof step !== 'string') return null
  const lowerStep = step.trim().toLowerCase().replace(/[_-]/g, ' ')
  if (lowerStep.includes('unstake')) return 'unstake'
  if (lowerStep.includes('bridge sent') || lowerStep === 'bridge') return 'bridge sent'
  if (lowerStep.includes('bridge received')) return 'bridge received'
  if (lowerStep.includes('stake')) return 'stake'
  return null
}

function collectCompletedSteps(payload: Record<string, unknown>): MigrationStep[] {
  const completed = new Set<MigrationStep>()

  const completedSteps = payload.completedSteps
  if (Array.isArray(completedSteps)) {
    for (const step of completedSteps) {
      const normalizedStep = normalizeStep(step)
      if (normalizedStep) completed.add(normalizedStep)
    }
  }

  const steps = payload.steps
  if (Array.isArray(steps)) {
    for (const stepEntry of steps) {
      if (!stepEntry || typeof stepEntry !== 'object') continue
      const entry = stepEntry as Record<string, unknown>
      const normalizedStep = normalizeStep(entry.step ?? entry.name ?? entry.id)
      const normalizedStatus =
        typeof entry.status === 'string' ? entry.status.toLowerCase().trim() : undefined
      if (normalizedStep && normalizedStatus === 'completed') {
        completed.add(normalizedStep)
      }
    }
  }

  return MIGRATION_STEPS.filter((step) => completed.has(step))
}

function normalizeApiProgress(rawPayload: unknown): ApiProgressPayload {
  const payload = rawPayload && typeof rawPayload === 'object' ? (rawPayload as Record<string, unknown>) : {}

  const rawStatus =
    typeof payload.status === 'string'
      ? payload.status.toLowerCase().trim()
      : typeof payload.state === 'string'
        ? payload.state.toLowerCase().trim()
        : 'migrating'

  const normalizedStatus: ApiProgressPayload['status'] =
    rawStatus === 'success' || rawStatus === 'completed' || rawStatus === 'done'
      ? 'success'
      : rawStatus === 'error' || rawStatus === 'failed'
        ? 'error'
        : 'migrating'

  const activeStep = normalizeStep(payload.activeStep ?? payload.step ?? payload.currentStep)
  const failedStep = normalizeStep(payload.failedStep ?? payload.errorStep)

  const reasonSource =
    payload.reason ??
    payload.message ??
    (payload.error && typeof payload.error === 'object'
      ? (payload.error as Record<string, unknown>).message
      : payload.error)

  const completedSteps = collectCompletedSteps(payload)

  const migrationId =
    typeof payload.migrationId === 'string'
      ? payload.migrationId
      : typeof payload.id === 'string'
        ? payload.id
        : null

  return {
    migrationId,
    status: normalizedStatus,
    completedSteps,
    activeStep,
    failedStep,
    reason: typeof reasonSource === 'string' ? reasonSource : null,
  }
}

function buildApiHeaders(migrationConfig: StakingMigrationWidgetConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (migrationConfig.migrationApiToken) {
    headers.Authorization = 'Bearer ' + migrationConfig.migrationApiToken
  }

  return headers
}

function hasRequiredConfig(migrationConfig: StakingMigrationWidgetConfig): boolean {
  return Boolean(migrationConfig.migrationApiBaseUrl && migrationConfig.migrationOperator)
}

export function useStakingMigrationAdapter({
  migrationConfig,
  onMigrationSuccess,
  onMigrationError,
}: UseStakingMigrationAdapterOptions = {}): StakingMigrationWidgetAdapterResult {
  const { address, chainId, isConnected, provider, connect } = useWallet()

  const resolvedConfig = useMemo<StakingMigrationWidgetConfig>(
    () => ({
      migrationApiBaseUrl: migrationConfig?.migrationApiBaseUrl,
      migrationOperator: migrationConfig?.migrationOperator,
      migrationApiToken: migrationConfig?.migrationApiToken,
    }),
    [
      migrationConfig?.migrationApiBaseUrl,
      migrationConfig?.migrationApiToken,
      migrationConfig?.migrationOperator,
    ],
  )

  const [state, setState] = useState<StakingMigrationWidgetState>(() => ({
    ...DEFAULT_STATE,
    hasRequiredConfig: hasRequiredConfig(resolvedConfig),
  }))

  const actionInFlightRef = useRef(false)
  const unmountedRef = useRef(false)

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: FUSE_CHAIN,
        transport: http(FUSE_CHAIN.rpcUrls.default.http[0]),
      }),
    [],
  )

  const walletClient = useMemo(() => {
    if (!provider || !address) return null

    return createWalletClient({
      account: address as Address,
      chain: FUSE_CHAIN,
      transport: custom(provider as EIP1193Provider),
    })
  }, [provider, address])

  const refreshStakeState = useCallback(async () => {
    if (!isConnected || !address) {
      setState((previousState) => ({
        ...previousState,
        status: hasRequiredConfig(resolvedConfig) ? 'summary' : 'missing-config',
        address: null,
        chainId: chainId ?? null,
        stakedAmount: '0',
        stakedAmountRaw: 0n,
        isBalanceLoading: false,
        hasRequiredConfig: hasRequiredConfig(resolvedConfig),
        isWrongNetwork: false,
        error: null,
      }))
      return
    }

    const configReady = hasRequiredConfig(resolvedConfig)
    const wrongNetwork = chainId !== FUSE_CHAIN_ID

    if (!configReady || wrongNetwork) {
      setState((previousState) => ({
        ...previousState,
        status: !configReady ? 'missing-config' : 'wrong-network',
        address,
        chainId: chainId ?? null,
        hasRequiredConfig: configReady,
        isWrongNetwork: wrongNetwork,
        isBalanceLoading: false,
        error: null,
      }))
      return
    }

    setState((previousState) => ({
      ...previousState,
      status: previousState.status === 'success' ? 'success' : 'summary',
      address,
      chainId: chainId ?? null,
      hasRequiredConfig: true,
      isWrongNetwork: false,
      isBalanceLoading: true,
      error: null,
    }))

    try {
      const [stakedAmountRaw, stakingTokenDecimals] = await Promise.all([
        publicClient.readContract({
          address: FUSE_STAKING_CONTRACT_ADDRESS,
          abi: fuseStakingAbi,
          functionName: 'balanceOf',
          args: [address as Address],
        }),
        publicClient.readContract({
          address: FUSE_STAKING_CONTRACT_ADDRESS,
          abi: fuseStakingAbi,
          functionName: 'decimals',
        }),
      ])

      const stakedAmount = formatUnits(stakedAmountRaw, stakingTokenDecimals)

      if (unmountedRef.current) return

      setState((previousState) => ({
        ...previousState,
        status: previousState.status === 'success' ? 'success' : 'summary',
        address,
        chainId: chainId ?? null,
        stakedAmount,
        stakedAmountRaw,
        isBalanceLoading: false,
        error: null,
      }))
    } catch (error: unknown) {
      if (unmountedRef.current) return
      setState((previousState) => ({
        ...previousState,
        status: 'error',
        address,
        chainId: chainId ?? null,
        isBalanceLoading: false,
        error: formatErrorMessage(error),
      }))
    }
  }, [address, chainId, isConnected, publicClient, resolvedConfig])

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
    }
  }, [])

  useEffect(() => {
    void refreshStakeState()
  }, [refreshStakeState])

  const applyMigrationProgress = useCallback(
    (progress: ApiProgressPayload, approvalTxHash: string) => {
      if (progress.status === 'success') {
        setState((previousState) => ({
          ...previousState,
          status: 'success',
          approvalTxHash,
          migrationId: progress.migrationId,
          completedSteps: progress.completedSteps.length > 0 ? progress.completedSteps : MIGRATION_STEPS,
          activeStep: null,
          failedStep: null,
          error: null,
        }))

        onMigrationSuccess?.({
          address: address!,
          approvalTxHash,
          migrationId: progress.migrationId ?? 'unknown',
          completedSteps:
            progress.completedSteps.length > 0 ? progress.completedSteps : [...MIGRATION_STEPS],
        })
        return true
      }

      if (progress.status === 'error') {
        const errorMessage = progress.reason ?? 'Migration failed during backend processing'

        setState((previousState) => ({
          ...previousState,
          status: 'error',
          approvalTxHash,
          migrationId: progress.migrationId,
          completedSteps: progress.completedSteps,
          activeStep: progress.activeStep,
          failedStep: progress.failedStep,
          error: errorMessage,
        }))

        onMigrationError?.({
          address: address ?? null,
          reason: errorMessage,
          failedStep: progress.failedStep,
        })
        return true
      }

      setState((previousState) => ({
        ...previousState,
        status: 'migrating',
        approvalTxHash,
        migrationId: progress.migrationId,
        completedSteps: progress.completedSteps,
        activeStep:
          progress.activeStep ??
          MIGRATION_STEPS.find((step) => !progress.completedSteps.includes(step)) ??
          null,
        failedStep: null,
        error: null,
      }))
      return false
    },
    [address, onMigrationError, onMigrationSuccess],
  )

  const submitMigrationApproval = useCallback(
    async (approvalTxHash: string): Promise<ApiProgressPayload> => {
      const baseUrl = resolvedConfig.migrationApiBaseUrl!
      const endpoint = `${baseUrl.replace(/\/$/, '')}/staking-migrations`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildApiHeaders(resolvedConfig),
        body: JSON.stringify({
          walletAddress: address,
          approvalTxHash,
          sourceChainId: FUSE_CHAIN_ID,
          stakingContract: FUSE_STAKING_CONTRACT_ADDRESS,
          migrationOperator: resolvedConfig.migrationOperator,
        }),
      })

      const responsePayload = (await response.json().catch(() => ({}))) as unknown

      if (!response.ok) {
        const normalizedPayload = normalizeApiProgress(responsePayload)
        throw new Error(normalizedPayload.reason ?? `Migration API request failed (${response.status})`)
      }

      return normalizeApiProgress(responsePayload)
    },
    [address, resolvedConfig],
  )

  const fetchMigrationProgress = useCallback(
    async (migrationId: string): Promise<ApiProgressPayload> => {
      const baseUrl = resolvedConfig.migrationApiBaseUrl!
      const endpoint = `${baseUrl.replace(/\/$/, '')}/staking-migrations/${migrationId}`

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: buildApiHeaders(resolvedConfig),
      })

      const responsePayload = (await response.json().catch(() => ({}))) as unknown

      if (!response.ok) {
        const normalizedPayload = normalizeApiProgress(responsePayload)
        throw new Error(normalizedPayload.reason ?? `Migration status request failed (${response.status})`)
      }

      return normalizeApiProgress(responsePayload)
    },
    [resolvedConfig],
  )

  const waitForMigrationCompletion = useCallback(
    async (approvalTxHash: string, initialProgress: ApiProgressPayload): Promise<void> => {
      let progress = initialProgress

      if (applyMigrationProgress(progress, approvalTxHash)) {
        return
      }

      const migrationId = progress.migrationId
      if (!migrationId) {
        throw new Error('Migration API did not return a migration id')
      }

      while (!unmountedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        progress = await fetchMigrationProgress(migrationId)
        const reachedTerminalState = applyMigrationProgress(progress, approvalTxHash)
        if (reachedTerminalState) {
          return
        }
      }
    },
    [applyMigrationProgress, fetchMigrationProgress],
  )

  const startApprovalAndMigration = useCallback(async () => {
    if (actionInFlightRef.current) return

    const configReady = hasRequiredConfig(resolvedConfig)
    if (!configReady) {
      setState((previousState) => ({
        ...previousState,
        status: 'missing-config',
        hasRequiredConfig: false,
        error: 'Missing migrationApiBaseUrl or migrationOperator in migrationConfig',
      }))
      return
    }

    if (!isConnected || !address) {
      await connect()
      return
    }

    if (chainId !== FUSE_CHAIN_ID) {
      setState((previousState) => ({
        ...previousState,
        status: 'wrong-network',
        isWrongNetwork: true,
        error: 'Switch wallet network to Fuse before approving migration',
      }))
      return
    }

    if (!walletClient) {
      setState((previousState) => ({
        ...previousState,
        status: 'approval-failed',
        error: 'Wallet client is not available for Fuse approval',
      }))
      return
    }

    if (state.stakedAmountRaw <= 0n) {
      setState((previousState) => ({
        ...previousState,
        status: 'summary',
        error: null,
      }))
      return
    }

    actionInFlightRef.current = true
    let approvalConfirmed = false
    setState((previousState) => ({
      ...previousState,
      status: 'approval-pending',
      error: null,
      failedStep: null,
    }))

    try {
      const approvalTxHash = await walletClient.writeContract({
        address: FUSE_STAKING_CONTRACT_ADDRESS,
        abi: fuseStakingAbi,
        functionName: 'approve',
        args: [resolvedConfig.migrationOperator!, state.stakedAmountRaw],
      })

      const approvalReceipt = await publicClient.waitForTransactionReceipt({
        hash: approvalTxHash,
      })

      if (approvalReceipt.status !== 'success') {
        throw new Error('Approval transaction did not confirm successfully')
      }
      approvalConfirmed = true

      const initialProgress = await submitMigrationApproval(approvalTxHash)
      await waitForMigrationCompletion(approvalTxHash, initialProgress)
    } catch (error: unknown) {
      const errorMessage = formatErrorMessage(error)
      const isApprovalFailure = !approvalConfirmed

      setState((previousState) => ({
        ...previousState,
        status: isApprovalFailure ? 'approval-failed' : 'error',
        error: errorMessage,
      }))

      onMigrationError?.({
        address: address ?? null,
        reason: errorMessage,
        failedStep: state.activeStep,
      })
    } finally {
      actionInFlightRef.current = false
    }
  }, [
    address,
    chainId,
    connect,
    isConnected,
    onMigrationError,
    publicClient,
    resolvedConfig,
    state.activeStep,
    state.stakedAmountRaw,
    state.status,
    submitMigrationApproval,
    waitForMigrationCompletion,
    walletClient,
  ])

  const retryMigration = useCallback(async () => {
    if (!state.approvalTxHash) {
      await startApprovalAndMigration()
      return
    }

    if (!hasRequiredConfig(resolvedConfig)) {
      setState((previousState) => ({
        ...previousState,
        status: 'missing-config',
        error: 'Missing migrationApiBaseUrl or migrationOperator in migrationConfig',
      }))
      return
    }

    actionInFlightRef.current = true
    setState((previousState) => ({
      ...previousState,
      status: 'migrating',
      error: null,
    }))

    try {
      const initialProgress = await submitMigrationApproval(state.approvalTxHash)
      await waitForMigrationCompletion(state.approvalTxHash, initialProgress)
    } catch (error: unknown) {
      const errorMessage = formatErrorMessage(error)
      setState((previousState) => ({
        ...previousState,
        status: 'error',
        error: errorMessage,
      }))
    } finally {
      actionInFlightRef.current = false
    }
  }, [resolvedConfig, startApprovalAndMigration, state.approvalTxHash, submitMigrationApproval, waitForMigrationCompletion])

  const switchToFuse = useCallback(async () => {
    if (!provider) return

    try {
      await (provider as EIP1193Provider).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${FUSE_CHAIN_ID.toString(16)}` }],
      })
    } catch {
      // no-op: wallet might not support programmatic switching
    } finally {
      await refreshStakeState()
    }
  }, [provider, refreshStakeState])

  return {
    state,
    actions: {
      connect,
      switchToFuse,
      refresh: refreshStakeState,
      approveAndMigrate: startApprovalAndMigration,
      retryMigration,
    },
  }
}
