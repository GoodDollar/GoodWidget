/**
 * Pure helpers for NextTaskModal, split out of the component so the logic is
 * unit-testable without rendering Tamagui.
 */

const ALLOWED_CTA_PROTOCOLS = new Set(['http:', 'https:'])

export const NEXT_TASK_HEADLINE = 'One good next step'
export const NEXT_TASK_SUPPORTING_COPY =
  'Small actions today create a bigger impact tomorrow. Thanks for being part of GoodDollar.'
export const NEXT_TASK_RECOMMENDED_LABEL = 'RECOMMENDED'
export const NEXT_TASK_SKIP_LABEL = 'Skip for now'
export const NAVIGATION_FAILED_TOAST_MESSAGE = 'Could not open this link. Please try again.'
export const REJECTED_URL_TOAST_MESSAGE = 'This link cannot be opened.'

export interface NextTaskContent {
  title: string
  description: string
  ctaLabel: string
  /** URL (when using `Anchor`) or arbitrary identifier (when using `resolveNavigation`). */
  ctaTarget: string
  /** External image asset shown in the card. Expected to be web-deliverable (HTTPS). */
  imageUrl?: string
  /** Opaque id surfaced on `onShown` for host-side analytics correlation. */
  contentId?: string
  headline?: string
  supportingCopy?: string
  recommendedLabel?: string
  skipLabel?: string
  statusLabel?: string
}

/**
 * Validates a CTA target before it is rendered as an external link (Anchor).
 * `content` is a plain host-supplied prop with no fetch or sanitization step,
 * so if that JSON ever originates from a less-trusted source upstream (e.g. a
 * future CMS), the component must not blindly navigate to whatever string it
 * contains. Only `http:`/`https:` are allowed — this rejects `javascript:`,
 * `data:`, and malformed URLs.
 *
 * Only applies when the host did not pass `resolveNavigation`: when it did,
 * the host owns navigation and the target is handed over untouched.
 */
export function isAllowedExternalCtaUrl(ctaTarget: string): boolean {
  try {
    const parsed = new URL(ctaTarget)
    return ALLOWED_CTA_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

/** True outside production — gates the console.warn calls for contained
 * integrator-callback errors so they don't spam a production console. */
export function isDevelopmentMode(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
}
