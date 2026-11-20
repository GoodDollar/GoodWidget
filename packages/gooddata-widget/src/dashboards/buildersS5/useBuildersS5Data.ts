/**
 * useBuildersS5Data — loads the latest stored gbmetrics report once on mount and again whenever the reader presses
 * "Try again". Reports are produced weekly, so there is no timer. While a retry is running the old answer is
 * cleared, so a failed retry never leaves earlier numbers on screen as if they were current.
 */
import { useCallback, useEffect, useState } from 'react'
import { getConnector } from '../../connectors/registry'
import { BUILDERS_S5_CONNECTOR_ID, type BuildersS5Data } from './connector'

export type BuildersS5LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: BuildersS5Data }

export function useBuildersS5Data(): { state: BuildersS5LoadState; retry: () => void } {
  const [state, setState] = useState<BuildersS5LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    getConnector<BuildersS5Data>(BUILDERS_S5_CONNECTOR_ID)
      .fetch()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        console.warn('Builders report could not be loaded:', error)
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((count) => count + 1), [])
  return { state, retry }
}
