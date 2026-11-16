import React from 'react'
import { createRoot } from 'react-dom/client'
import { EcosystemWidget } from '@goodwidget/ecosystem-widget'
import type { EcosystemWidgetId } from '@goodwidget/ecosystem-widget'
import { createMockEip1193Provider } from '../../../../examples/storybook/src/fixtures/mockEip1193'

const ids: EcosystemWidgetId[] = ['citizen-claim', 'goodreserve', 'streaming', 'ai-credits']
const requested = new URLSearchParams(location.search).get('widgets')?.split(',') ?? []
const widgets = requested.filter((id): id is EcosystemWidgetId => ids.includes(id as EcosystemWidgetId))

createRoot(document.getElementById('root')!).render(
  <EcosystemWidget widgets={widgets} provider={createMockEip1193Provider()} nativeMode />,
)
