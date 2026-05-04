import { SavingsWidgetElement } from './element'

/**
 * Auto-registers the SavingsWidget as a custom element under the
 * `gw-savings` tag name. Import this module as a side effect:
 *
 * ```ts
 * import '@goodwidget/savings-widget/register'
 * ```
 *
 * Then use:
 * ```html
 * <gw-savings></gw-savings>
 * ```
 */
customElements.define('gw-savings', SavingsWidgetElement)
