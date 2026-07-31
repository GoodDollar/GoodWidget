const TAG_NAME = 'gw-claim-widget'

/**
 * Register the <gw-claim-widget> custom element.
 *
 * Call once at the top of your app or in a <script> tag:
 *   import '@goodwidget/claim-widget-theme-demo/register'
 *
 * Then use in HTML:
 *   <gw-claim-widget></gw-claim-widget>
 *
 * Resolves to the tag name so you can use it programmatically:
 *   const tag = await register()  // 'gw-claim-widget'
 */
export async function register(tagName: string = TAG_NAME): Promise<string> {
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { ClaimWidgetElement } = await import('./element')
    customElements.define(tagName, ClaimWidgetElement)
  }
  return tagName
}

void register()
