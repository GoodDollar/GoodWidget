import { GoodReserveWidgetElement } from './element'

const DEFAULT_TAG_NAME = 'gw-goodreserve-widget'

// Registers the reserve widget custom element for non-React hosts.
export function register(tagName: string = DEFAULT_TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, GoodReserveWidgetElement)
  }
  return tagName
}

register()
