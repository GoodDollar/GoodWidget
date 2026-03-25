/**
 * Bridge between Web Component attributes/properties and React props.
 */
export type PropType = 'attribute' | 'property'

export interface PropDefinition {
  type: PropType
  default?: unknown
}

export type PropDefinitions = Record<string, PropType | PropDefinition>

/**
 * Normalize a prop definition map into a consistent form.
 */
export function normalizePropDefs(
  defs: PropDefinitions,
): Record<string, PropDefinition> {
  const result: Record<string, PropDefinition> = {}
  for (const [key, value] of Object.entries(defs)) {
    if (typeof value === 'string') {
      result[key] = { type: value }
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Convert a camelCase prop name to a kebab-case attribute name.
 */
export function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

/**
 * Convert a kebab-case attribute name to a camelCase prop name.
 */
export function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * Dispatch a typed CustomEvent from an element.
 */
export function emitEvent(element: HTMLElement, eventName: string, detail?: unknown): void {
  element.dispatchEvent(
    new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail,
    }),
  )
}
