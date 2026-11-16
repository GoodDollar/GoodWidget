import { PasskeyLoginWidgetElement } from './element.ts'

const DEFAULT_TAG_NAME = 'gw-passkey-login'

/**
 * Register the <gw-passkey-login> custom element.
 *
 *   import '@goodwidget/passkey-login-widget/register'
 *
 * Or register under a custom tag:
 *   const tag = register('my-passkey-login')
 */
export function register(tagName: string = DEFAULT_TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, PasskeyLoginWidgetElement)
  }
  return tagName
}

register()
