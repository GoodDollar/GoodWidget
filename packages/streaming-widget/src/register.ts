const DEFAULT_TAG_NAME = 'gw-streaming'

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
  // Keep server-side package evaluation out of the browser-only element graph.
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { StreamingWidgetElement } = await import('./element')
    customElements.define(tagName, StreamingWidgetElement)
  }
  return tagName
}

void register()
