import { isDevelopmentMode } from './nextTaskNavigation.ts'

/**
 * Calls an optional integrator callback and contains any error it throws, so a
 * faulty analytics/notification callback cannot break the modal, the claim
 * result or the refresh that surrounds it. Errors are surfaced as a
 * development-only warning because these callbacks are observers, not
 * navigation (navigation failures are shown to the user, see NextTaskModal).
 */
export function invokeHostCallbackSafely<Payload>(
  callbackName: string,
  callback: ((payload: Payload) => void) | undefined,
  payload: Payload,
): void {
  if (!callback) return
  try {
    callback(payload)
  } catch (error) {
    if (isDevelopmentMode()) {
      console.warn(`[NextTaskModal] ${callbackName} threw; the error was contained.`, { error })
    }
  }
}
