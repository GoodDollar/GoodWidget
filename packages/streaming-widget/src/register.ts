const DEFAULT_TAG_NAME = 'gw-streaming'

export const goodWidgetMetadata = {
  packageName: '@goodwidget/streaming-widget',
  packageVersion: '0.1.1',
} as const

/**
 * Register the <gw-streaming> custom element.
 *
 * Call once at the top of your app or in a <script> tag:
 *   import '@goodwidget/streaming-widget/register'
 *
 * Then use in HTML:
 *   <gw-streaming></gw-streaming>
 *
 * Resolves to the tag name so you can use it programmatically:
 *   const tag = await register()  // 'gw-streaming'
 *
 * Or register under a custom tag:
 *   const tag = await register('my-streaming-widget')
 */
export async function register(tagName: string = DEFAULT_TAG_NAME): Promise<string> {
  // Keep browser-only Custom Element dependencies out of server evaluation.
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { StreamingWidgetElement } = await import('./element')
    // The auto-registration above and an explicit caller can both pass the
    // outer check before this import settles; re-check so the loser is a no-op.
    if (!customElements.get(tagName)) {
      customElements.define(tagName, StreamingWidgetElement)
    }
  }
  return tagName
}

void register().catch(() => undefined)
