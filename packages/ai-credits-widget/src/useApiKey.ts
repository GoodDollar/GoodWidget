import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AiCreditsAccountId,
  AiCreditsApi,
  AiCreditsApiAccount,
  AiCreditsKeyPurchase,
} from './aiCreditsApi/types'

/** Key-management operation currently awaiting the backend. */
export type ApiKeyPendingAction = 'rotate' | 'revoke' | 'create'

export interface ApiKeyState {
  account: AiCreditsApiAccount | null
  loading: boolean
  pendingAction: ApiKeyPendingAction | null
  error: string | null
  /**
   * Full key to show once. Held in memory only: never written to storage, logs or analytics,
   * and cleared as soon as the user dismisses the "key is ready" sheet.
   */
  revealedKey: string | null
  /** A paid purchase whose key could not be created; kept so the user can retry without paying again. */
  unfulfilledPurchase: AiCreditsKeyPurchase | null
}

export interface ApiKeyActions {
  refresh: () => Promise<void>
  /** Called once a payment settles: creates the user's key or tops up its spend limit. */
  fulfillPurchase: (purchase: AiCreditsKeyPurchase) => Promise<void>
  retryUnfulfilledPurchase: () => Promise<void>
  rotateKey: () => Promise<void>
  revokeKey: () => Promise<void>
  dismissRevealedKey: () => void
}

interface UseApiKeyOptions {
  aiCreditsApi: AiCreditsApi | undefined
  accountId: AiCreditsAccountId | null
}

const INITIAL_API_KEY_STATE: ApiKeyState = {
  account: null,
  loading: false,
  pendingAction: null,
  error: null,
  revealedKey: null,
  unfulfilledPurchase: null,
}

/** Message shown for failures. Backend error text is not surfaced, so a key can never leak through it. */
function describeFailure(action: string): string {
  return `Could not ${action}. Please try again.`
}

/** Owns the user's gateway API key state and the calls that change it. */
export function useApiKey({ aiCreditsApi, accountId }: UseApiKeyOptions): {
  state: ApiKeyState
  actions: ApiKeyActions
} {
  const [state, setState] = useState<ApiKeyState>(INITIAL_API_KEY_STATE)
  const activeAccountIdRef = useRef(accountId)
  activeAccountIdRef.current = accountId

  const refresh = useCallback(async () => {
    if (!aiCreditsApi || !accountId) return
    setState((previous) => ({ ...previous, loading: true, error: null }))
    try {
      const account = await aiCreditsApi.getAccount(accountId)
      if (activeAccountIdRef.current !== accountId) return
      setState((previous) => ({ ...previous, account, loading: false }))
    } catch {
      if (activeAccountIdRef.current !== accountId) return
      setState((previous) => ({
        ...previous,
        loading: false,
        error: describeFailure('load your API key'),
      }))
    }
  }, [aiCreditsApi, accountId])

  // A different wallet must never inherit the previous wallet's key or account.
  useEffect(() => {
    setState(INITIAL_API_KEY_STATE)
  }, [accountId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const fulfillPurchase = useCallback(
    async (purchase: AiCreditsKeyPurchase) => {
      if (!aiCreditsApi) return
      setState((previous) => ({
        ...previous,
        pendingAction: 'create',
        error: null,
        unfulfilledPurchase: null,
      }))
      try {
        const issue = await aiCreditsApi.createOrTopUpKey(purchase)
        setState((previous) => ({
          ...previous,
          account: issue.account,
          pendingAction: null,
          revealedKey: issue.fullKey,
        }))
      } catch {
        setState((previous) => ({
          ...previous,
          pendingAction: null,
          unfulfilledPurchase: purchase,
          error: describeFailure('set up your API key. Your payment went through'),
        }))
      }
    },
    [aiCreditsApi],
  )

  const retryUnfulfilledPurchase = useCallback(async () => {
    if (!state.unfulfilledPurchase) return
    await fulfillPurchase(state.unfulfilledPurchase)
  }, [fulfillPurchase, state.unfulfilledPurchase])

  const rotateKey = useCallback(async () => {
    if (!aiCreditsApi || !accountId) return
    setState((previous) => ({ ...previous, pendingAction: 'rotate', error: null }))
    try {
      const issue = await aiCreditsApi.rotateKey(accountId)
      setState((previous) => ({
        ...previous,
        account: issue.account,
        pendingAction: null,
        revealedKey: issue.fullKey,
      }))
    } catch {
      setState((previous) => ({
        ...previous,
        pendingAction: null,
        error: describeFailure('rotate your API key'),
      }))
    }
  }, [aiCreditsApi, accountId])

  const revokeKey = useCallback(async () => {
    if (!aiCreditsApi || !accountId) return
    setState((previous) => ({ ...previous, pendingAction: 'revoke', error: null }))
    try {
      const account = await aiCreditsApi.revokeKey(accountId)
      setState((previous) => ({ ...previous, account, pendingAction: null }))
    } catch {
      setState((previous) => ({
        ...previous,
        pendingAction: null,
        error: describeFailure('revoke your API key'),
      }))
    }
  }, [aiCreditsApi, accountId])

  const dismissRevealedKey = useCallback(() => {
    setState((previous) => ({ ...previous, revealedKey: null }))
  }, [])

  return {
    state,
    actions: {
      refresh,
      fulfillPurchase,
      retryUnfulfilledPurchase,
      rotateKey,
      revokeKey,
      dismissRevealedKey,
    },
  }
}
