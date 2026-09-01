/**
 * App — thin host for the GoodData widget package. Owns only mount/config:
 * registers the AI Credits dashboard (with the deployment's worker URL
 * override, if any) and renders the shared GoodDataWidget shell inside this
 * app's TamaguiProvider. All dashboard business logic — data fetching,
 * state, layout, and routing — lives in @goodwidget/gooddata-widget.
 */
import React from 'react'
import { defaultConfig } from '@goodwidget/ui'
import { TamaguiProvider } from '@tamagui/core'
import { GoodDataWidget, registerAiCreditsDashboard } from '@goodwidget/gooddata-widget'

// The worker URL is overridable via VITE_ANTSEED_ANALYTICS_WORKER_URL so a
// deployment can point at a staging/production worker without a code
// change; reading import.meta.env here (rather than inside the widget
// package) keeps the package itself bundler-agnostic.
registerAiCreditsDashboard({
  workerUrl: import.meta.env.VITE_ANTSEED_ANALYTICS_WORKER_URL,
})

export function App() {
  return (
    <TamaguiProvider config={defaultConfig} defaultTheme="dark">
      <GoodDataWidget />
    </TamaguiProvider>
  )
}
