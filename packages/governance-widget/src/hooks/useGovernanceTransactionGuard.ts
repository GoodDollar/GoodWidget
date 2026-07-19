import { useCallback, useEffect, useMemo, useRef } from 'react'

export interface GovernanceTransactionToken {
  id: number
  scope: string
}

/**
 * Keeps one wallet transaction active per account/chain/contract scope.
 * A scope change invalidates callbacks from the previous wallet before they
 * can publish receipt state into the newly connected account.
 */
export function useGovernanceTransactionGuard(scope: string) {
  const scopeRef = useRef(scope)
  const nextIdRef = useRef(0)
  const activeIdRef = useRef<number | null>(null)
  scopeRef.current = scope

  useEffect(() => {
    nextIdRef.current += 1
    activeIdRef.current = null
  }, [scope])

  const begin = useCallback((): GovernanceTransactionToken | null => {
    if (activeIdRef.current !== null) return null

    const id = ++nextIdRef.current
    activeIdRef.current = id
    return { id, scope: scopeRef.current }
  }, [])

  const isCurrent = useCallback((token: GovernanceTransactionToken): boolean => (
    token.id === activeIdRef.current && token.scope === scopeRef.current
  ), [])

  const finish = useCallback((token: GovernanceTransactionToken): void => {
    if (isCurrent(token)) activeIdRef.current = null
  }, [isCurrent])

  return useMemo(
    () => ({ begin, isCurrent, finish }),
    [begin, finish, isCurrent],
  )
}
