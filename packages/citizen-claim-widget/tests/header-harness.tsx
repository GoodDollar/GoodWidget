import React from 'react'
import { createRoot } from 'react-dom/client'
import { CitizenClaimWidget } from '../src/CitizenClaimWidget'
import { CitizenClaimWidgetElement } from '../src/element'

document.getElementById('storybook-root')!.style.display = 'none'
const container = document.createElement('div')
container.id = 'fixture-root'
document.body.appendChild(container)
const root = createRoot(container)

export function render(hideHeader?: boolean) {
  root.render(
    <CitizenClaimWidget hideHeader={hideHeader} chainId={42220} initialTab="news-feed" />,
  )
}

export function mountElement() {
  const tag = 'test-citizen-claim-header'
  if (!customElements.get(tag)) customElements.define(tag, CitizenClaimWidgetElement)
  const element = document.createElement(tag) as CitizenClaimWidgetElement
  element.chainId = 42220
  element.initialTab = 'news-feed'
  document.body.appendChild(element)
}
