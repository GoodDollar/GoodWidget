const DEFAULT_TAG_NAME = 'gw-goodreserve-widget'

export const goodWidgetMetadata = {
  packageName: '@goodwidget/goodreserve-widget',
  packageVersion: '0.1.1',
} as const

export async function register(tagName: string = DEFAULT_TAG_NAME): Promise<string> {
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { GoodReserveWidgetElement } = await import('./element')
    customElements.define(tagName, GoodReserveWidgetElement)
  }
  return tagName
}

void register().catch(() => undefined)
