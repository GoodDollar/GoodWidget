const TAG_NAME = 'gw-staking-migration-widget'

// This helper registers the default staking migration custom element tag.
export async function register(tagName: string = TAG_NAME): Promise<string> {
  // Keep package discovery and SSR evaluation out of the element's
  // browser-only dependency graph, not merely free of DOM side effects.
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { StakingMigrationWidgetElement } = await import('./element')
    customElements.define(tagName, StakingMigrationWidgetElement)
  }
  return tagName
}

void register()
