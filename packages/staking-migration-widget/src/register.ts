import { StakingMigrationWidgetElement } from './element'

const TAG_NAME = 'gw-staking-migration-widget'

// This helper registers the default staking migration custom element tag.
export function register(tagName: string = TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, StakingMigrationWidgetElement)
  }
  return tagName
}

register()
