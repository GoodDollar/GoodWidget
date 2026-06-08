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
  normalizeStakingMigrationEnvironment,
  resolveMigrationConfigForEnvironment,
  type ResolvedStakingMigrationConfig,
} from './migrationEnvironments'
import {
  FUSE_CHAIN_ID,
  FUSE_STAKING_CONTRACT_ADDRESS,
  type MigrationStep,
  type StakingMigrationErrorDetail,
  type StakingMigrationPrimaryAction,
  type StakingMigrationSuccessDetail,
  type StakingMigrationWidgetAdapterResult,
  type StakingMigrationWidgetEnvironment,
  type StakingMigrationWidgetState,
} from './widgetRuntimeContract'

const MIGRATION_STEPS: MigrationStep[] = ['unstake', 'bridge sent', 'bridge received', 'stake']

const MIGRATION_SUBMIT_PATH = '/migrate-stake-from-approval'
const MIGRATION_STATUS_PATH = '/migrate-stake-status'
const MIGRATION_STATUS_STREAM_PATH = '/migrate-stake-status/stream'
const MIGRATION_STATUS_POLL_INTERVAL_MS = 2500

const fuseStakingAbi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
])

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

const WORKER_STEP_CHECKPOINTS: Record<MigrationStep, string[]> = {
  unstake: ['fuse_transfer', 'fuse_withdraw', 'fuse_bridge_sent', 'celo_bridge_received', 'celo_staked', 'completed'],
  'bridge sent': ['fuse_bridge_sent', 'celo_bridge_received', 'celo_staked', 'completed'],
  'bridge received': ['celo_bridge_received', 'celo_staked', 'completed'],
  stake: ['celo_staked', 'completed'],
}

interface WorkerMigrationState {
  approvalTxHash: string
  user?: string
  status: 'pending' | 'completed' | 'failed'
  lastSuccessfulStep?: string
  lastError?: {
    stage: string
    message: string
    at: string
  }
  updatedAt?: string
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
  environment?: StakingMigrationWidgetEnvironment
  onMigrationSuccess?: (detail: StakingMigrationSuccessDetail) => void
  onMigrationError?: (detail: StakingMigrationErrorDetail) => void
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
  primaryAction: 'none',
  primaryLabel: '',
}

function formatErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Unexpected migration error'
  const lowerMessage = error.message.toLowerCase()
  if (lowerMessage.includes('user rejected') || lowerMessage.includes('rejected the request')) {
    return 'Approval rejected in wallet'
  }
  return error.message
}

function hasRequiredConfig(migrationConfig: ResolvedStakingMigrationConfig): boolean {
  return Boolean(migrationConfig.migrationApiBaseUrl && migrationConfig.migrationOperator)
}

function buildApiHeaders(migrationConfig: ResolvedStakingMigrationConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (migrationConfig.migrationApiToken) {
    headers.Authorization = 'Bearer ' + migrationConfig.migrationApiToken
  }

  return headers
}

function buildMigrationApiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function workerStepCompletesWidgetStep(
  lastSuccessfulStep: string | undefined,
  widgetStep: MigrationStep,
): boolean {
  if (!lastSuccessfulStep) return false
  return WORKER_STEP_CHECKPOINTS[widgetStep].includes(lastSuccessfulStep)
}

function mapWorkerStageToFailedStep(stage: string): MigrationStep | null {
  const normalizedStage = stage.toLowerCase()
  if (
    normalizedStage.includes('fuse_transfer') ||
    normalizedStage.includes('fuse_withdraw') ||
    normalizedStage.includes('unstake')
  ) {
    return 'unstake'
  }
  if (normalizedStage.includes('fuse_bridge_sent') || normalizedStage.includes('bridge_sent')) {
    return 'bridge sent'
  }
  if (normalizedStage.includes('celo_bridge_received') || normalizedStage.includes('bridge_received')) {
    return 'bridge received'
  }
  if (normalizedStage.includes('celo_staked') || normalizedStage.includes('stake')) {
    return 'stake'
  }
  return null
}

function mapWorkerStateToProgress(state: WorkerMigrationState): ApiProgressPayload {
  const completedSteps = MIGRATION_STEPS.filter((step) =>
    workerStepCompletesWidgetStep(state.lastSuccessfulStep, step),
  )
  const activeStep = MIGRATION_STEPS.find((step) => !completedSteps.includes(step)) ?? null
  const failedStep =
    state.status === 'failed' && state.lastError?.stage
      ? mapWorkerStageToFailedStep(state.lastError.stage)
      : null

  const status: ApiProgressPayload['status'] =
    state.status === 'completed' ? 'success' : state.status === 'failed' ? 'error' : 'migrating'

  return {
    migrationId: state.approvalTxHash,
    status,
    completedSteps,
    activeStep: status === 'success' ? null : failedStep ?? activeStep,
    failedStep,
    reason: state.lastError?.message ?? null,
  }
}

function createCompletedProgress(approvalTxHash: string): ApiProgressPayload {
  return {
    migrationId: approvalTxHash,
    status: 'success',
    completedSteps: [...MIGRATION_STEPS],
    activeStep: null,
    failedStep: null,
    reason: null,
  }
}

function parseSseFrame(frame: string): { event: string; data: unknown } | null {
  let event = 'message'
  let dataStr = ''

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    }
    if (line.startsWith('data:')) {
      dataStr += line.slice(5).trim()
    }
  }

  if (!dataStr) return null

  try {
    return { event, data: JSON.parse(dataStr) as unknown }
  } catch {
    return null
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timeout)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function fetchWorkerMigrationState(
  approvalTxHash: string,
  migrationConfig: ResolvedStakingMigrationConfig,
): Promise<WorkerMigrationState> {
  const endpoint = `${buildMigrationApiUrl(migrationConfig.migrationApiBaseUrl!, MIGRATION_STATUS_PATH)}?approvalTxHash=${encodeURIComponent(approvalTxHash)}`
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: buildApiHeaders(migrationConfig),
  })

  const responsePayload = (await response.json().catch(() => ({}))) as unknown

  if (response.status === 404) {
    throw new Error('Migration state not found')
  }

  if (!response.ok) {
    const payload =
      responsePayload && typeof responsePayload === 'object'
        ? (responsePayload as Record<string, unknown>)
        : {}
    throw new Error(
      typeof payload.error === 'string'
        ? payload.error
        : `Migration status request failed (${response.status})`,
    )
  }

  return responsePayload as WorkerMigrationState
}

async function submitMigrationStart(
  approvalTxHash: string,
  migrationConfig: ResolvedStakingMigrationConfig,
): Promise<'started' | 'completed'> {
  const endpoint = buildMigrationApiUrl(migrationConfig.migrationApiBaseUrl!, MIGRATION_SUBMIT_PATH)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildApiHeaders(migrationConfig),
    body: JSON.stringify({ approvalTxHash }),
  })

  const responsePayload = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (response.status === 409) {
    return 'started'
  }

  if (!response.ok) {
    throw new Error(
      typeof responsePayload.error === 'string'
        ? responsePayload.error
        : `Migration API request failed (${response.status})`,
    )
  }

  if (responsePayload.skipped === true) {
    throw new Error(
      typeof responsePayload.skipReason === 'string'
        ? responsePayload.skipReason
        : 'Migration was skipped by backend',
    )
  }

  return 'completed'
}

async function watchMigrationViaPolling(
  approvalTxHash: string,
  migrationConfig: ResolvedStakingMigrationConfig,
  signal: AbortSignal,
  onProgress: (progress: ApiProgressPayload) => boolean,
): Promise<void> {
  while (!signal.aborted) {
    try {
      const workerState = await fetchWorkerMigrationState(approvalTxHash, migrationConfig)
      if (onProgress(mapWorkerStateToProgress(workerState))) {
        return
      }
    } catch (error: unknown) {
      if (!(error instanceof Error) || error.message !== 'Migration state not found') {
        throw error
      }
    }

    await sleep(MIGRATION_STATUS_POLL_INTERVAL_MS, signal)
  }
}

async function watchMigrationViaSse(
  approvalTxHash: string,
  migrationConfig: ResolvedStakingMigrationConfig,
  signal: AbortSignal,
  onProgress: (progress: ApiProgressPayload) => boolean,
): Promise<void> {
  const endpoint = `${buildMigrationApiUrl(migrationConfig.migrationApiBaseUrl!, MIGRATION_STATUS_STREAM_PATH)}?approvalTxHash=${encodeURIComponent(approvalTxHash)}`
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: buildApiHeaders(migrationConfig),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`Migration SSE request failed (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (!signal.aborted) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let frameEnd = buffer.indexOf('\n\n')
    while (frameEnd >= 0) {
      const frame = buffer.slice(0, frameEnd)
      buffer = buffer.slice(frameEnd + 2)
      const parsedFrame = parseSseFrame(frame)

      if (parsedFrame?.event === 'state' && parsedFrame.data && typeof parsedFrame.data === 'object') {
        const payload = parsedFrame.data as Record<string, unknown>
        if (payload.status === 'not_found') {
          frameEnd = buffer.indexOf('\n\n')
          continue
        }

        if (onProgress(mapWorkerStateToProgress(parsedFrame.data as WorkerMigrationState))) {
          return
        }
      }

      if (parsedFrame?.event === 'done') {
        return
      }

      frameEnd = buffer.indexOf('\n\n')
    }
  }
}

async function watchMigrationProgress(
  approvalTxHash: string,
  migrationConfig: ResolvedStakingMigrationConfig,
  signal: AbortSignal,
  onProgress: (progress: ApiProgressPayload) => boolean,
): Promise<void> {
  try {
    await watchMigrationViaSse(approvalTxHash, migrationConfig, signal, onProgress)
  } catch {
    await watchMigrationViaPolling(approvalTxHash, migrationConfig, signal, onProgress)
  }
}

function derivePrimaryAction(state: StakingMigrationWidgetState): StakingMigrationPrimaryAction {
  if (state.isBalanceLoading) return 'none'
  if (!state.hasRequiredConfig || state.status === 'missing-config') return 'none'
  if (state.stakedAmountRaw <= 0n) return 'none'
  if (!state.address) return 'connect'
  if (state.status === 'wrong-network') return 'switch_chain'
  if (state.status === 'approval-pending' || state.status === 'migrating') return 'none'
  if (state.status === 'success') return 'refresh'
  if (state.status === 'approval-failed' || state.status === 'error') return 'retry'
  return 'migrate'
}

function derivePrimaryLabel(
  state: StakingMigrationWidgetState,
  primaryAction: StakingMigrationPrimaryAction,
): string {
  if (state.isBalanceLoading) return 'Loading...'
  if (!state.hasRequiredConfig || state.status === 'missing-config') return 'Setup required'
  if (state.stakedAmountRaw <= 0n) return 'No balance'
  if (state.status === 'approval-pending') return 'Approval pending'
  if (state.status === 'migrating') return 'Migrating'

  switch (primaryAction) {
    case 'connect':
      return 'Connect wallet'
    case 'switch_chain':
      return 'Switch to Fuse'
    case 'migrate':
      return 'Approve & Migrate'
    case 'retry':
      return state.status === 'approval-failed' ? 'Retry approval' : 'Retry migration'
    case 'refresh':
      return 'Refresh balance'
    default:
      return ''
  }
}

export function useStakingMigrationAdapter({
  environment,
  onMigrationSuccess,
  onMigrationError,
}: UseStakingMigrationAdapterOptions = {}): StakingMigrationWidgetAdapterResult {
  const { address, chainId, isConnected, provider, connect } = useWallet()

  const resolvedEnvironment = useMemo(
    () => normalizeStakingMigrationEnvironment(environment),
    [environment],
  )

  const resolvedConfig = useMemo<ResolvedStakingMigrationConfig>(
    () => resolveMigrationConfigForEnvironment(resolvedEnvironment),
    [resolvedEnvironment],
  )

  const [state, setState] = useState<StakingMigrationWidgetState>(() => ({
    ...DEFAULT_STATE,
    hasRequiredConfig: hasRequiredConfig(resolvedConfig),
  }))

  const actionInFlightRef = useRef(false)
  const unmountedRef = useRef(false)
  const migrationWatchAbortRef = useRef<AbortController | null>(null)

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

  const stopMigrationWatch = useCallback(() => {
    migrationWatchAbortRef.current?.abort()
    migrationWatchAbortRef.current = null
  }, [])

  const applyMigrationProgress = useCallback(
    (progress: ApiProgressPayload, approvalTxHash: string) => {
      if (progress.status === 'success') {
        setState((previousState) => ({
          ...previousState,
          status: 'success',
          approvalTxHash,
          migrationId: progress.migrationId ?? approvalTxHash,
          completedSteps: progress.completedSteps.length > 0 ? progress.completedSteps : MIGRATION_STEPS,
          activeStep: null,
          failedStep: null,
          error: null,
        }))

        onMigrationSuccess?.({
          address: address!,
          approvalTxHash,
          migrationId: progress.migrationId ?? approvalTxHash,
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
          migrationId: progress.migrationId ?? approvalTxHash,
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
        migrationId: progress.migrationId ?? approvalTxHash,
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

  const runMigrationJob = useCallback(
    async (approvalTxHash: string) => {
      stopMigrationWatch()

      const abortController = new AbortController()
      migrationWatchAbortRef.current = abortController
      let reachedTerminalState = false

      const watchPromise = watchMigrationProgress(
        approvalTxHash,
        resolvedConfig,
        abortController.signal,
        (progress) => {
          const terminal = applyMigrationProgress(progress, approvalTxHash)
          if (terminal) {
            reachedTerminalState = true
            stopMigrationWatch()
          }
          return terminal
        },
      ).catch((error: unknown) => {
        if (reachedTerminalState || unmountedRef.current) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        throw error
      })

      try {
        const postResult = await submitMigrationStart(approvalTxHash, resolvedConfig)
        if (postResult === 'completed' && !reachedTerminalState) {
          reachedTerminalState = applyMigrationProgress(
            createCompletedProgress(approvalTxHash),
            approvalTxHash,
          )
        }
      } catch (error: unknown) {
        if (!reachedTerminalState) {
          throw error
        }
      }

      await watchPromise
    },
    [applyMigrationProgress, resolvedConfig, stopMigrationWatch],
  )

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
      stopMigrationWatch()
    }
  }, [stopMigrationWatch])

  useEffect(() => {
    void refreshStakeState()
  }, [refreshStakeState])

  const startApprovalAndMigration = useCallback(async () => {
    if (actionInFlightRef.current) return

    const configReady = hasRequiredConfig(resolvedConfig)
    if (!configReady) {
      setState((previousState) => ({
        ...previousState,
        status: 'missing-config',
        hasRequiredConfig: false,
        error: 'Migration backend configuration is unavailable for the selected environment',
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

      setState((previousState) => ({
        ...previousState,
        status: 'migrating',
        approvalTxHash,
        migrationId: approvalTxHash,
      }))

      await runMigrationJob(approvalTxHash)
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
      stopMigrationWatch()
    }
  }, [
    address,
    chainId,
    connect,
    isConnected,
    onMigrationError,
    publicClient,
    resolvedConfig,
    runMigrationJob,
    state.activeStep,
    state.stakedAmountRaw,
    stopMigrationWatch,
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
        error: 'Migration backend configuration is unavailable for the selected environment',
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
      await runMigrationJob(state.approvalTxHash)
    } catch (error: unknown) {
      const errorMessage = formatErrorMessage(error)
      setState((previousState) => ({
        ...previousState,
        status: 'error',
        error: errorMessage,
      }))
    } finally {
      actionInFlightRef.current = false
      stopMigrationWatch()
    }
  }, [resolvedConfig, runMigrationJob, startApprovalAndMigration, state.approvalTxHash, stopMigrationWatch])

  const switchToFuse = useCallback(async () => {
    if (!provider) return

    try {
      await (provider as EIP1193Provider).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${FUSE_CHAIN_ID.toString(16)}` }],
      })
    } catch {
    } finally {
      await refreshStakeState()
    }
  }, [provider, refreshStakeState])

  const derivedState = useMemo(() => {
    const primaryAction = derivePrimaryAction(state)
    const primaryLabel = derivePrimaryLabel(state, primaryAction)
    return {
      ...state,
      primaryAction,
      primaryLabel,
    }
  }, [state])

  return {
    state: derivedState,
    actions: {
      connect,
      switchToFuse,
      refresh: refreshStakeState,
      approveAndMigrate: startApprovalAndMigration,
      retryMigration,
    },
  }
}
