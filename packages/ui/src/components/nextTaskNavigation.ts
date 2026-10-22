/**
 * Pure navigation-decision helpers for NextTaskModal, split out of the
 * component so the branch logic is unit-testable without rendering Tamagui.
 */

const ALLOWED_CTA_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Validates a CTA target before it is handed to the external-link fallback
 * (window.open / Linking.openURL). `content` is a plain host-supplied prop
 * with no fetch or sanitization step, so if that JSON ever originates from a
 * less-trusted source upstream (e.g. a future CMS), the component must not
 * blindly navigate to whatever string it contains. Only `http:`/`https:` are
 * allowed — this rejects `javascript:`, `data:`, and malformed URLs.
 *
 * Only applies on the fallback path: when a host's `resolveNavigation`
 * returns `true`, the host has already taken responsibility for the target
 * and this check does not run.
 */
export function isAllowedExternalCtaUrl(ctaTarget: string): boolean {
  try {
    const parsed = new URL(ctaTarget)
    return ALLOWED_CTA_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Resolves whether a host's `resolveNavigation` fully handled navigation.
 *
 * Contract: `resolveNavigation?: (ctaTarget: string) => boolean | void`
 *   - no prop passed              → external-link fallback always runs
 *   - returns `true`              → host handled it; no fallback
 *   - returns `false`/`undefined` → fallback runs
 *   - throws                      → caught, treated as `false`, reported via onError
 */
export function resolveCtaNavigationOutcome(
  ctaTarget: string,
  resolveNavigation: ((ctaTarget: string) => boolean | void) | undefined,
  onError: (error: unknown) => void,
): boolean {
  if (!resolveNavigation) return false
  try {
    return resolveNavigation(ctaTarget) === true
  } catch (error) {
    onError(error)
    return false
  }
}

/** True outside production — gates the console.warn calls on rejected URLs
 * and resolveNavigation errors so they don't spam a production console. */
export function isDevelopmentMode(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
}
