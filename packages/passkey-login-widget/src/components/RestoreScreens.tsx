import React from 'react'
import type { PasskeyLoginAdapterActions } from '../adapter.ts'
import { ProgressSteps } from './ProgressSteps.tsx'
import { ProviderChoice } from './ProviderChoice.tsx'
import type { PasskeyProviderOption } from '../adapter.ts'
import type { PasskeyProviderId } from '../widgetRuntimeContract.ts'
import { ScreenAction, ScreenCard } from './ScreenCard.tsx'

/** Steps shown while an account is restored from a backup (C2). */
export const RESTORE_STEP_LABELS = ['Passkey verified', 'Backup found', 'Decrypting']

/** C1: asks where the backup lives when the widget cannot tell. Pressing a tile continues immediately. */
export function RestoreProviderScreen({
  providerOptions,
  onSelect,
}: {
  providerOptions: PasskeyProviderOption[]
  onSelect: (providerId: PasskeyProviderId) => void
}) {
  return (
    <ScreenCard title="Where is your backup?" data-testid="screen-C1">
      <ProviderChoice providerOptions={providerOptions} selectedProviderId={null} onSelect={onSelect} />
    </ScreenCard>
  )
}

/** C2: looking up, then decrypting the backup. */
export function RestoreProgressScreen({ activeStepIndex }: { activeStepIndex: number }) {
  return (
    <ScreenCard title="Restoring your account…" data-testid="screen-C2">
      <ProgressSteps stepLabels={RESTORE_STEP_LABELS} activeStepIndex={activeStepIndex} />
    </ScreenCard>
  )
}

/** C3: the account was restored; Continue hands the key to the host. */
export function RestoreSuccessScreen({ actions }: { actions: PasskeyLoginAdapterActions }) {
  return (
    <ScreenCard icon="check" title="Welcome back" description="Your account has been restored." data-testid="screen-C3">
      <ScreenAction label="Continue" onPress={actions.finish} />
    </ScreenCard>
  )
}
