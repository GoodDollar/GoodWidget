/**
 * Collect Tamagui-generated CSS and inject it into a Shadow DOM root.
 * This is necessary because Tamagui injects styles into document.head by default,
 * which are not visible inside a Shadow DOM boundary.
 */
export function injectStylesIntoShadow(shadowRoot: ShadowRoot, css: string): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = css
  shadowRoot.prepend(style)
  return style
}

export function updateShadowStyles(styleEl: HTMLStyleElement, css: string): void {
  styleEl.textContent = css
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
