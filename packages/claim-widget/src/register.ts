import { ClaimWidgetElement } from './element'

const TAG_NAME = 'gw-claim-widget'

/**
 * Register the <gw-claim-widget> custom element.
 *
 * Call once at the top of your app or in a <script> tag:
 *   import '@goodwidget/claim-widget/register'
 *
 * Then use in HTML:
 *   <gw-claim-widget></gw-claim-widget>
 *
 * Returns the tag name so you can use it programmatically:
 *   const tag = register()  // 'gw-claim-widget'
 */
export function register(tagName: string = TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, ClaimWidgetElement)
  }
  return tagName
}

register()
