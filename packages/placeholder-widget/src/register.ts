import { PlaceholderWidgetElement } from './element'

const TAG_NAME = 'gw-placeholder-widget'

/**
 * Register the <gw-placeholder-widget> custom element.
 *
 * Returns the tag name so callers can use it programmatically:
 *   const tag = register()  // 'gw-placeholder-widget'
 */
export function register(tagName: string = TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, PlaceholderWidgetElement)
  }
  return tagName
}

register()
