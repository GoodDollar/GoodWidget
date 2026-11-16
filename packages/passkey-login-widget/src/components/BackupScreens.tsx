import React, { useState } from 'react'
import { Text, YStack } from '@goodwidget/ui'
import type { PasskeyLoginAdapterActions, PasskeyProviderOption } from '../adapter.ts'
import type { PasskeyProviderId } from '../widgetRuntimeContract.ts'
import { ProgressSteps } from './ProgressSteps.tsx'
import { ProviderChoice } from './ProviderChoice.tsx'
import { ScreenAction, ScreenCard } from './ScreenCard.tsx'

/** B1: offers an already logged-in user to back up their account with a passkey. */
export function BackupPromptScreen({ actions }: { actions: PasskeyLoginAdapterActions }) {
  return (
    <ScreenCard
      icon="shield-check"
      title="Back up your account with a passkey"
      description="Your account key is encrypted with your passkey and stored in your Google Drive or iCloud."
      data-testid="screen-B1"
    >
      <YStack gap="$2">
        <ScreenAction label="Set up passkey backup" onPress={actions.startBackup} />
        <ScreenAction label="Not now" variant="text" onPress={actions.skip} />
      </YStack>
    </ScreenCard>
  )
}

export interface BackupProviderScreenProps {
  providerOptions: PasskeyProviderOption[]
  /** Tile that starts out selected: the remembered provider, else the first one offered. */
  preselectedProviderId: PasskeyProviderId | null
  onContinue: (providerId: PasskeyProviderId) => void
}

/** B2: choose where the backup is stored; the chosen tile is confirmed with Continue. */
export function BackupProviderScreen({ providerOptions, preselectedProviderId, onContinue }: BackupProviderScreenProps) {
  const [selectedProviderId, setSelectedProviderId] = useState(preselectedProviderId)
  return (
    <ScreenCard title="Choose where to back up" data-testid="screen-B2">
      <ProviderChoice
        providerOptions={providerOptions}
        selectedProviderId={selectedProviderId}
        onSelect={setSelectedProviderId}
      />
      <Text tone="secondary" center>
        Encrypted with your passkey. Only you can decrypt it.
      </Text>
      <ScreenAction
        label="Continue"
        onPress={() => {
          if (selectedProviderId) {
            onContinue(selectedProviderId)
          }
        }}
      />
    </ScreenCard>
  )
}

export interface BackupProgressScreenProps {
  providerLabel: string
}

/** B3: key is encrypted and being uploaded to the chosen provider. */
export function BackupProgressScreen({ providerLabel }: BackupProgressScreenProps) {
  const stepLabels = ['Passkey verified', 'Key encrypted', `Uploading to ${providerLabel}`]
  return (
    <ScreenCard title="Backing up your account…" data-testid="screen-B3">
      <ProgressSteps stepLabels={stepLabels} activeStepIndex={2} />
    </ScreenCard>
  )
}

/** B4: the backup exists. */
export function BackupSuccessScreen({
  providerLabel,
  actions,
}: {
  providerLabel: string
  actions: PasskeyLoginAdapterActions
}) {
  return (
    <ScreenCard
      icon="check"
      title="Backup complete"
      description={`Your account is backed up to ${providerLabel}.`}
      data-testid="screen-B4"
    >
      <ScreenAction label="Continue" onPress={actions.finish} />
    </ScreenCard>
  )
}
