const DEFAULT_TAG_NAME = 'gw-superfluid-campaign'

export const goodWidgetMetadata = {
  packageName: '@goodwidget/superfluid-campaign-widget',
  packageVersion: '0.1.1',
} as const

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
 *   const tag = await register()  // 'gw-superfluid-campaign'
 *
 * Or register under a custom tag:
 *   const tag = register('my-superfluid-campaign-widget')
 */
export async function register(tagName: string = DEFAULT_TAG_NAME): Promise<string> {
  // Keep browser-only Custom Element dependencies out of server evaluation.
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { SuperfluidCampaignWidgetElement } = await import('./element')
    customElements.define(tagName, SuperfluidCampaignWidgetElement)
  }
  return tagName
}

void register().catch(() => undefined)
