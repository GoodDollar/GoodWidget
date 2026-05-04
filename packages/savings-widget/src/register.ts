import { SavingsWidgetElement } from './element'

const TAG_NAME = 'gw-savings-widget'

/**
 * Register the <gw-savings-widget> custom element.
 *
 * Call once at the top of your app or in a <script> tag:
 *   import '@goodwidget/savings-widget/register'
 *
 * Then use in HTML:
 *   <gw-savings-widget></gw-savings-widget>
 *
 * Returns the tag name so you can use it programmatically:
 *   const tag = register()  // 'gw-savings-widget'
 */
export function register(tagName: string = TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, SavingsWidgetElement)
  }
  return tagName
}

register()
