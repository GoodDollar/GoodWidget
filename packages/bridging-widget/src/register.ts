import { BridgingWidgetElement } from './element'

const DEFAULT_TAG_NAME = 'gw-bridging'

/**
 * Register the <gw-bridging> custom element.
 *
 * Call once at the top of your app or in a <script> tag:
 *   import '@goodwidget/bridging-widget/register'
 *
 * Then use in HTML:
 *   <gw-bridging></gw-bridging>
 *
 * Returns the tag name so you can use it programmatically:
 *   const tag = register()  // 'gw-bridging'
 *
 * Or register under a custom tag:
 *   const tag = register('my-bridging-widget')
 */
export function register(tagName: string = DEFAULT_TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, BridgingWidgetElement)
  }
  return tagName
}

register()
