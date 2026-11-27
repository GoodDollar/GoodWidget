const DEFAULT_TAG_NAME = 'gw-goodreserve-widget'

export const goodWidgetMetadata = {
  packageName: '@goodwidget/goodreserve-widget',
  packageVersion: '0.1.2',
} as const

export async function register(tagName: string = DEFAULT_TAG_NAME): Promise<string> {
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { GoodReserveWidgetElement } = await import('./element')
    // The auto-registration above and an explicit caller can both pass the
    // outer check before this import settles; re-check so the loser is a no-op.
    if (!customElements.get(tagName)) {
      customElements.define(tagName, GoodReserveWidgetElement)
    }
  }
  return tagName
}

void register().catch(() => undefined)
