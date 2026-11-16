import { EcosystemWidgetElement } from './element'

export function register(tagName = 'gw-ecosystem-widget'): string {
  if (!customElements.get(tagName)) customElements.define(tagName, EcosystemWidgetElement)
  return tagName
}

if (typeof customElements !== 'undefined') register()
