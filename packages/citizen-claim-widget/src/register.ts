const DEFAULT_TAG_NAME = 'gw-citizen-claim'

/**
 * Register the <gw-citizen-claim> custom element.
 *
 * Call once at the top of your app or in a <script> tag:
 *   import '@goodwidget/citizen-claim-widget/register'
 *
 * Then use in HTML:
 *   <gw-citizen-claim></gw-citizen-claim>
 *
 * Resolves to the tag name so you can use it programmatically:
 *   const tag = await register()  // 'gw-citizen-claim'
 *
 * Or register under a custom tag:
 *   const tag = await register('my-claim-widget')
 */
export async function register(tagName: string = DEFAULT_TAG_NAME): Promise<string> {
  // A server must not evaluate the browser-only element dependency graph.
  // Load it only after confirming that this is a Custom Elements runtime.
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { CitizenClaimWidgetElement } = await import('./element')
    customElements.define(tagName, CitizenClaimWidgetElement)
  }
  return tagName
}

void register()
