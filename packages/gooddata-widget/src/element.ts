import { createMiniAppElement } from '@goodwidget/embed'
import { GoodDataWidget } from './GoodDataWidget'
import type React from 'react'

/**
 * A Custom Element class wrapping the GoodDataWidget React component.
 *
 * Register it with any tag name:
 *   customElements.define('gooddata-widget', GoodDataWidgetElement)
 *
 * Then use in HTML:
 *   <gooddata-widget></gooddata-widget>
 *
 * Register dashboards and their connectors (e.g. via registerAiCreditsDashboard())
 * before mounting — the element only carries routing config as properties,
 * not per-dashboard connector settings:
 *   const el = document.querySelector('gooddata-widget')
 *   el.basename = '/analytics'
 */
const GoodDataWidgetElementBase = createMiniAppElement(GoodDataWidget as React.ComponentType<Record<string, unknown>>, {
  shadow: true,
  defaultTheme: 'dark',
  props: {
    basename: 'property',
  },
})

export class GoodDataWidgetElement extends GoodDataWidgetElementBase {
  declare basename: string | undefined
}
