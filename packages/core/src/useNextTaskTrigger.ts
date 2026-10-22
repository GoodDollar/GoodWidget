import { useCallback, useMemo } from 'react'
import { dispatchNextTaskTrigger } from './nextTaskEventBus'
import type { NextTaskTriggerDetail } from './nextTaskEventBus'

export interface NextTaskTriggerFirePayload {
  /** Identifies what caused the trigger, e.g. 'claim'. */
  source: string
  /** Optional caller-supplied context passed through to the modal untouched. */
  metadata?: Record<string, unknown>
}

export interface UseNextTaskTriggerResult {
  fire: (payload: NextTaskTriggerFirePayload) => NextTaskTriggerDetail
}

/**
 * useNextTaskTrigger — tells any mounted `NextTaskModal` (from @goodwidget/ui)
 * to open, by dispatching a window-scoped `gw:next-task-trigger` CustomEvent.
 *
 * Integration contract: exactly one `NextTaskModal` should be mounted per
 * page. This hook does not detect or coordinate multiple instances — see
 * NextTaskModal's own doc comment for why that coordination was deliberately
 * left out.
 */
export function useNextTaskTrigger(): UseNextTaskTriggerResult {
  const fire = useCallback((payload: NextTaskTriggerFirePayload) => dispatchNextTaskTrigger(payload), [])
  // Memoized so consumers can safely put the returned object in a dependency
  // array (e.g. CitizenClaimWidget's handlePrimaryAction) without it
  // invalidating on every render.
  return useMemo(() => ({ fire }), [fire])
}
