import { defaultTokenValues } from './theme'

export interface ComponentManifestEntry {
  name: string
  extends?: string
  themeKeys: string[]
  variants: string[]
}

export interface ThemeManifest {
  components: Record<string, ComponentManifestEntry>
  tokens: Record<string, string[]>
}

const componentRegistry = new Map<string, ComponentManifestEntry>()

export function registerComponent(entry: ComponentManifestEntry): void {
  componentRegistry.set(entry.name, entry)
}

export function getComponentManifest(name: string): ComponentManifestEntry | undefined {
  return componentRegistry.get(name)
}

export function getThemeManifest(): ThemeManifest {
  const components: Record<string, ComponentManifestEntry> = {}
  for (const [name, entry] of componentRegistry) {
    components[name] = entry
  }

  return {
    components,
    tokens: Object.fromEntries(
      Object.entries(defaultTokenValues).map(([category, values]) => [category, Object.keys(values)]),
    ),
  }
}
