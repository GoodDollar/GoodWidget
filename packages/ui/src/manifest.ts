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
    tokens: {
      color: [
        'primary',
        'primaryDark',
        'primaryLight',
        'secondary',
        'secondaryDark',
        'success',
        'warning',
        'error',
        'background',
        'surface',
        'text',
        'textSecondary',
        'border',
      ],
      space: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      size: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'],
      radius: ['0', '1', '2', '3', '4', '5', '6'],
    },
  }
}
