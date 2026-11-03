import { ConnectAWalletWidgetElement } from './element'

const DEFAULT_TAG_NAME = 'gw-connect-a-wallet'

/**
 * Register the <gw-connect-a-wallet> custom element.
 *
 * Call once at the top of your app or in a <script> tag:
 *   import '@goodwidget/connect-a-wallet-widget/register'
 *
 * Then use in HTML:
 *   <gw-connect-a-wallet></gw-connect-a-wallet>
 *
 * Returns the tag name so you can use it programmatically:
 *   const tag = register()  // 'gw-connect-a-wallet'
 *
 * Or register under a custom tag:
 *   const tag = register('my-connect-wallet-widget')
 */
export function register(tagName: string = DEFAULT_TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, ConnectAWalletWidgetElement)
  }
  return tagName
}

register()
