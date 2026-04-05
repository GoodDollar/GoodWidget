/**
 * Collect Tamagui-generated CSS and inject it into a Shadow DOM root.
 * This is necessary because Tamagui injects styles into document.head by default,
 * which are not visible inside a Shadow DOM boundary.
 */
export function injectStylesIntoShadow(shadowRoot: ShadowRoot, css: string): HTMLStyleElement {
  const style = document.createElement('style')
  style.setAttribute('data-goodwidget-reset', 'true')
  style.textContent = css
  shadowRoot.prepend(style)
  return style
}

export function updateShadowStyles(styleEl: HTMLStyleElement, css: string): void {
  styleEl.textContent = css
}

const RUNTIME_STYLE_ATTR = 'data-goodwidget-runtime-style'
const RUNTIME_STYLE_SELECTOR = [
  'style[data-tamagui]',
  'style[id*="tamagui"]',
  'style[id="react-native-stylesheet"]',
  'style[id*="react-native"]',
  'style[data-rnw]',
  // Fallback for Tamagui/RNW styles when ids/attrs vary across environments.
  'style',
].join(', ')

/**
 * Mirror runtime-generated style tags from document.head into a shadow root.
 * Tamagui and react-native-web inject styles into the main document, which are
 * otherwise invisible to components rendered inside Shadow DOM.
 */
export function syncRuntimeStylesIntoShadow(shadowRoot: ShadowRoot): () => void {
  let lastSnapshot = ''

  const normalizeForShadow = (css: string): string => {
    // Theme variable selectors from Tamagui often target `:root ...`.
    // Inside shadow DOM we need those rules anchored to the host boundary.
    return css.replace(/\:root\b/g, ':host')
  }

  const extractCSS = (style: HTMLStyleElement): string => {
    const inlineText = style.textContent?.trim()
    if (inlineText) return normalizeForShadow(inlineText)

    const sheet = style.sheet as CSSStyleSheet | null
    if (!sheet) return ''

    try {
      const rules = Array.from(sheet.cssRules)
      return normalizeForShadow(rules.map((rule) => rule.cssText).join('\n'))
    } catch {
      // Accessing cssRules can fail for some browser-managed sheets.
      return ''
    }
  }

  const sync = () => {
    const runtimeStyles = Array.from(document.head.querySelectorAll<HTMLStyleElement>(RUNTIME_STYLE_SELECTOR))
    const snapshot = runtimeStyles
      .map((style) => {
        const css = extractCSS(style)
        return `${style.id}|${style.getAttribute('data-tamagui') ?? ''}|${css.length}|${css.slice(0, 120)}`
      })
      .join('||')

    if (snapshot === lastSnapshot) {
      return
    }
    lastSnapshot = snapshot

    shadowRoot.querySelectorAll(`style[${RUNTIME_STYLE_ATTR}]`).forEach((node) => node.remove())

    for (const style of runtimeStyles) {
      const cssText = extractCSS(style)
      if (!cssText.trim()) continue

      const clone = document.createElement('style')
      clone.setAttribute(RUNTIME_STYLE_ATTR, 'true')
      clone.textContent = cssText
      shadowRoot.appendChild(clone)
    }
  }

  sync()

  const observer = new MutationObserver(() => {
    sync()
  })

  observer.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  })

  // CSSOM `insertRule()` updates don't mutate DOM nodes, so observe+poll.
  const interval = window.setInterval(sync, 150)

  return () => {
    observer.disconnect()
    window.clearInterval(interval)
  }
}

/**
 * Create a basic reset stylesheet for the shadow DOM to prevent
 * host page styles from leaking in.
 */
export function getResetCSS(): string {
  return `
    :host {
      display: block;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    :host([hidden]) {
      display: none;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
  `
}
