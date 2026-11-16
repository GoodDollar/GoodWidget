import React from 'react'
import { Alert, YStack } from '@goodwidget/ui'
import type { PasskeyLoginAdapterActions } from '../adapter.ts'
import { ProgressSteps } from './ProgressSteps.tsx'
import { ScreenAction, ScreenCard, WaitingState } from './ScreenCard.tsx'

/** Steps shown while a new passkey and account are created (A4). */
export const CREATE_PASSKEY_STEP_LABELS = ['Create passkey', 'Generate account', 'Encrypt key', 'Back up']

/** A1: entry screen of the login flow. */
export function EntryScreen({ actions }: { actions: PasskeyLoginAdapterActions }) {
  return (
    <ScreenCard icon="shield-check" title="Sign in with passkey" data-testid="screen-A1">
      <YStack gap="$2">
        <ScreenAction label="Continue with passkey" onPress={actions.startLogin} />
        <ScreenAction label="Use another login method" variant="text" onPress={actions.skip} />
      </YStack>
    </ScreenCard>
  )
}

/** A2: waiting for the passkey prompt of the browser. */
export function AuthenticatingScreen() {
  return (
    <ScreenCard icon="shield-check" title="Sign in with passkey" data-testid="screen-A2">
      <WaitingState message="Waiting for your passkey…" />
    </ScreenCard>
  )
}

/** A3: confirms that continuing creates a brand-new account, and points existing users to the backup route. */
export function NewAccountWarningScreen({ actions }: { actions: PasskeyLoginAdapterActions }) {
  return (
    <ScreenCard data-testid="screen-A3">
      <Alert type="warning" message="No passkey found. Continuing will create a NEW account." />
      <Alert
        type="info"
        message="Already have an account with Google, Facebook or SMS? Log in with that method first, create a passkey backup, then log in with your passkey."
      />
      <YStack gap="$2">
        <ScreenAction label="Create new account" onPress={actions.confirmNewAccount} />
        <ScreenAction label="Back to login methods" variant="secondary" onPress={actions.skip} />
      </YStack>
    </ScreenCard>
  )
}

/** A4: creating the passkey, the account and the first backup. */
export function CreatePasskeyScreen({ activeStepIndex }: { activeStepIndex: number }) {
  return (
    <ScreenCard title="Creating your passkey…" data-testid="screen-A4">
      <ProgressSteps stepLabels={CREATE_PASSKEY_STEP_LABELS} activeStepIndex={activeStepIndex} />
    </ScreenCard>
  )
}
