import { createMiniAppElement } from '@goodwidget/embed'
import { PlaceholderWidget } from './PlaceholderWidget'

/**
 * A Custom Element class wrapping the PlaceholderWidget React component.
 *
 * Register it with any tag name:
 *   customElements.define('gw-placeholder', PlaceholderWidgetElement)
 */
export const PlaceholderWidgetElement = createMiniAppElement(
  PlaceholderWidget as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'dark',
  },
)
