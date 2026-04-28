import { CitizenClaimWidgetElement } from './element'

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
 * Returns the tag name so you can use it programmatically:
 *   const tag = register()  // 'gw-citizen-claim'
 *
 * Or register under a custom tag:
 *   const tag = register('my-claim-widget')
 */
export function register(tagName: string = DEFAULT_TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, CitizenClaimWidgetElement)
  }
  return tagName
}

register()
