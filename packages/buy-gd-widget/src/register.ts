import { BuyGdWidgetElement } from './element'

const DEFAULT_TAG_NAME = 'gw-buy-gd-widget'

export function register(tagName: string = DEFAULT_TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, BuyGdWidgetElement)
  }
  return tagName
}

register()
