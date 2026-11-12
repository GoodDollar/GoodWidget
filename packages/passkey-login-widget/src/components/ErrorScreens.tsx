import React from 'react'
import { Alert, YStack } from '@goodwidget/ui'
import type { PasskeyLoginAdapterActions } from '../adapter.ts'
import { ScreenAction, ScreenCard } from './ScreenCard.tsx'
import type { ReactNode } from 'react'

interface ErrorScreenProps {
  screenId: string
  title: string
  message?: string
  children: ReactNode
}

/** Shared D-screen layout: red alert, then the recovery actions. */
function ErrorScreen({ screenId, title, message, children }: ErrorScreenProps) {
  return (
    <ScreenCard data-testid={screenId}>
      <Alert type="error" title={title} message={message ?? ''} />
      <YStack gap="$2">{children}</YStack>
    </ScreenCard>
  )
}

/** D1: no WebAuthn / PRF support in the browser or the passkey provider. Only way out is another login method. */
export function UnsupportedBrowserScreen({ actions }: { actions: PasskeyLoginAdapterActions }) {
  return (
    <ScreenCard data-testid="screen-D1">
      <Alert
        type="warning"
        message="Your browser or passkey provider doesn't support the feature passkey login needs (WebAuthn PRF). Use Google Password Manager in Chrome or iCloud Keychain in Safari, or use another login method."
      />
      <ScreenAction label="Back to login methods" variant="secondary" onPress={actions.skip} />
    </ScreenCard>
  )
}

/**
 * D2: the passkey request failed or was cancelled. WebAuthn cannot tell "cancelled" from "no
 * passkey on this device", so a failed login attempt also offers to create a new account.
 * `isRequestFailure` (PASSKEY_FAILED) is the same layout for a request the browser or passkey provider rejected
 * with something other than a dismissal: it says so instead of "cancelled" and always offers another login method.
 */
export function PasskeyCancelledScreen({
  actions,
  offersNewAccount,
  isRequestFailure,
}: {
  actions: PasskeyLoginAdapterActions
  offersNewAccount: boolean
  isRequestFailure: boolean
}) {
  return (
    <ErrorScreen
      screenId="screen-D2"
      title={isRequestFailure ? 'Passkey request failed' : 'Passkey request cancelled'}
      message={
        isRequestFailure
          ? 'Your browser or passkey provider returned an error. Retry, or use another login method.'
          : undefined
      }
    >
      <ScreenAction label="Retry" onPress={actions.retry} />
      {offersNewAccount && (
        <ScreenAction label="Create new account" variant="secondary" onPress={actions.requestNewAccount} />
      )}
      {isRequestFailure && <ScreenAction label="Back to login methods" variant="text" onPress={actions.skip} />}
    </ErrorScreen>
  )
}

/** D3: no backup under this passkey at the chosen provider. */
export function BackupNotFoundScreen({
  providerLabel,
  offersOtherProvider,
  actions,
}: {
  providerLabel: string
  offersOtherProvider: boolean
  actions: PasskeyLoginAdapterActions
}) {
  return (
    <ErrorScreen screenId="screen-D3" title={`No backup found in ${providerLabel}`}>
      {offersOtherProvider && <ScreenAction label="Try the other provider" onPress={actions.chooseOtherProvider} />}
      <ScreenAction label="Back" variant="secondary" onPress={actions.goBack} />
    </ErrorScreen>
  )
}

/** D4: sign-in or consent with the provider failed. */
export function ProviderAuthFailedScreen({
  providerLabel,
  offersOtherProvider,
  actions,
}: {
  providerLabel: string
  offersOtherProvider: boolean
  actions: PasskeyLoginAdapterActions
}) {
  return (
    <ErrorScreen screenId="screen-D4" title={`Couldn't connect to ${providerLabel}`}>
      <ScreenAction label="Try again" onPress={actions.retry} />
      {offersOtherProvider && (
        <ScreenAction label="Choose another provider" variant="secondary" onPress={actions.chooseOtherProvider} />
      )}
    </ErrorScreen>
  )
}

/** D5: the backup could not be written. Skipping is only offered to users who are already logged in. */
export function BackupFailedScreen({
  offersSkip,
  actions,
}: {
  offersSkip: boolean
  actions: PasskeyLoginAdapterActions
}) {
  return (
    <ErrorScreen screenId="screen-D5" title="Backup failed. Your account is not backed up yet.">
      <ScreenAction label="Retry" onPress={actions.retry} />
      {offersSkip && <ScreenAction label="Skip for now" variant="secondary" onPress={actions.skip} />}
    </ErrorScreen>
  )
}

/** D6: the backup could not be unlocked, or several backups matched one passkey (`AMBIGUOUS_BACKUP`). */
export function DecryptFailedScreen({
  isAmbiguousBackup,
  actions,
}: {
  isAmbiguousBackup: boolean
  actions: PasskeyLoginAdapterActions
}) {
  const title = isAmbiguousBackup
    ? 'More than one backup matches this passkey'
    : "Couldn't unlock this backup with your passkey"
  const message = isAmbiguousBackup
    ? "We can't tell which account to restore. Contact support before continuing."
    : undefined
  return (
    <ErrorScreen screenId="screen-D6" title={title} message={message}>
      <ScreenAction label="Try again" onPress={actions.retry} />
      <ScreenAction label="Back" variant="secondary" onPress={actions.goBack} />
    </ErrorScreen>
  )
}
