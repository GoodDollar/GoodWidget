const DEFAULT_TAG_NAME = 'gw-goodreserve-widget'

// Registers the reserve widget custom element for non-React hosts.
export async function register(tagName: string = DEFAULT_TAG_NAME): Promise<string> {
  // Next.js may evaluate this entry in Node. Defer the element import because
  // its React/Tamagui graph is needed only when a browser can register it.
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { GoodReserveWidgetElement } = await import('./element')
    customElements.define(tagName, GoodReserveWidgetElement)
  }
  return tagName
}

void register()
