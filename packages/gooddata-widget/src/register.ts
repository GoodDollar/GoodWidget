const DEFAULT_TAG_NAME = 'gooddata-widget'

export const goodWidgetMetadata = {
  packageName: '@goodwidget/gooddata-widget',
  packageVersion: '0.1.0',
} as const

/**
 * Register the <gooddata-widget> custom element.
 *
 * Call once at the top of your app or in a <script> tag:
 *   import '@goodwidget/gooddata-widget/register'
 *
 * Then use in HTML:
 *   <gooddata-widget></gooddata-widget>
 *
 * Resolves to the tag name so you can use it programmatically:
 *   const tag = await register()  // 'gooddata-widget'
 *
 * Or register under a custom tag:
 *   const tag = await register('my-gooddata-widget')
 */
export async function register(tagName: string = DEFAULT_TAG_NAME): Promise<string> {
  // Keep browser-only Custom Element dependencies out of server evaluation.
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { GoodDataWidgetElement } = await import('./element')
    customElements.define(tagName, GoodDataWidgetElement)
  }
  return tagName
}

void register().catch(() => undefined)
