/**
 * Pure helpers for NextTaskModal, split out of the component so the logic is
 * unit-testable without rendering Tamagui.
 */

const ALLOWED_CTA_PROTOCOLS = new Set(['http:', 'https:'])

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
