/**
 * nextTaskEventBus — window-scoped CustomEvent dispatch/subscribe helpers
 * backing `useNextTaskTrigger`.
 *
 * GoodWidget widgets deploy two ways: as host-imported React components
 * (same module graph as the host app, e.g. apps/ai-credits-web) and as
 * isolated Shadow-DOM custom elements (createMiniAppElement, a separate JS
 * bundle with its own React tree). A module-level store (like Dialog.tsx's
 * GoodWidgetDialog) only reaches listeners in the same bundle, so it cannot
 * notify a `NextTaskModal` living on the other side of a Shadow-DOM
 * boundary. `window` is the one channel both deployment shapes share.
 */

/** Falls back to a standalone EventTarget outside a browser/react-native-web
 * environment (e.g. this module's own Node unit tests) so the dispatch and
 * subscribe logic stays exercisable without a DOM. */
const eventTarget: EventTarget = typeof window !== 'undefined' ? window : new EventTarget()

export const NEXT_TASK_TRIGGER_EVENT = 'gw:next-task-trigger'

export interface NextTaskTriggerDetail {
  /** Identifies what caused the trigger, e.g. 'claim'. */
  source: string
  /** Unique per `fire()` call — lets a NextTaskModal ignore a duplicate
   * trigger that arrives while it is already open for an earlier one. */
  triggerId: string
  /** Optional caller-supplied context passed through to the modal untouched. */
  metadata?: Record<string, unknown>
}

export type NextTaskTriggerListener = (detail: NextTaskTriggerDetail) => void

let triggerSequence = 0

/** Deterministic, dependency-free unique id — avoids pulling in a uuid
 * library for a value that only needs to be unique within one page session. */
export function createNextTaskTriggerId(): string {
  triggerSequence += 1
  return `next-task-${triggerSequence}`
}

export function dispatchNextTaskTrigger(payload: {
  source: string
  metadata?: Record<string, unknown>
}): NextTaskTriggerDetail {
  const detail: NextTaskTriggerDetail = { ...payload, triggerId: createNextTaskTriggerId() }
  eventTarget.dispatchEvent(new CustomEvent<NextTaskTriggerDetail>(NEXT_TASK_TRIGGER_EVENT, { detail }))
  return detail
}

/** Subscribes to trigger events; returns an unsubscribe function for cleanup. */
export function subscribeToNextTaskTrigger(listener: NextTaskTriggerListener): () => void {
  const handler = (event: Event) => {
    listener((event as CustomEvent<NextTaskTriggerDetail>).detail)
  }
  eventTarget.addEventListener(NEXT_TASK_TRIGGER_EVENT, handler)
  return () => eventTarget.removeEventListener(NEXT_TASK_TRIGGER_EVENT, handler)
}
