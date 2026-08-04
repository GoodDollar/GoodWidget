import { SuperfluidCampaignWidgetElement } from './element'

const DEFAULT_TAG_NAME = 'gw-superfluid-campaign'

/**
 * Register the <gw-superfluid-campaign> custom element.
 *
 * Call once at the top of your app or in a <script> tag:
 *   import '@goodwidget/superfluid-campaign-widget/register'
 *
 * Then use in HTML:
 *   <gw-superfluid-campaign></gw-superfluid-campaign>
 *
 * Returns the tag name so you can use it programmatically:
 *   const tag = register()  // 'gw-superfluid-campaign'
 *
 * Or register under a custom tag:
 *   const tag = register('my-superfluid-campaign-widget')
 */
export function register(tagName: string = DEFAULT_TAG_NAME): string {
  if (typeof window !== 'undefined' && 'customElements' in window && !customElements.get(tagName)) {
    customElements.define(tagName, SuperfluidCampaignWidgetElement)
  }
  return tagName
}

if (typeof window !== 'undefined' && 'customElements' in window) {
  register()
}
