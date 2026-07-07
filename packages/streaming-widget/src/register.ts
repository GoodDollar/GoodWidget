import { StreamingWidgetElement } from './element'

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
 * Returns the tag name so you can use it programmatically:
 *   const tag = register()  // 'gw-streaming'
 *
 * Or register under a custom tag:
 *   const tag = register('my-streaming-widget')
 */
export function register(tagName: string = DEFAULT_TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, StreamingWidgetElement)
  }
  return tagName
}

register()
