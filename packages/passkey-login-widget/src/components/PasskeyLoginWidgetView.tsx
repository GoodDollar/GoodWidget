import React from 'react'
import { WidgetVersion, YStack } from '@goodwidget/ui'
import { version } from '../../package.json'
import type { PasskeyLoginAdapterResult } from '../adapter.ts'
import { BackupFailedScreen, BackupNotFoundScreen, DecryptFailedScreen, PasskeyCancelledScreen, ProviderAuthFailedScreen, UnsupportedBrowserScreen } from './ErrorScreens.tsx'
import { BackupProgressScreen, BackupPromptScreen, BackupProviderScreen, BackupSuccessScreen } from './BackupScreens.tsx'
import { AuthenticatingScreen, CreatePasskeyScreen, EntryScreen, NewAccountWarningScreen } from './LoginScreens.tsx'
import { RestoreProgressScreen, RestoreProviderScreen, RestoreSuccessScreen } from './RestoreScreens.tsx'

/** Used in provider-dependent copy when no provider was picked yet. */
const FALLBACK_PROVIDER_LABEL = 'your backup provider'

export interface PasskeyLoginWidgetViewProps {
  adapter: PasskeyLoginAdapterResult
  'data-testid'?: string
}

/** Renders the screen the flow is currently on (A1-D6). All behavior lives in the adapter. */
export function PasskeyLoginWidgetView({
  adapter,
  'data-testid': dataTestId = 'passkey-login-widget',
}: PasskeyLoginWidgetViewProps) {
  const { flowState, providerOptions, preselectedProviderId, actions } = adapter
  const providerLabel =
    providerOptions.find((providerOption) => providerOption.id === flowState.providerId)?.label ??
    FALLBACK_PROVIDER_LABEL
  const { hasMultipleProviders, isExistingUser } = flowState

  function renderScreen() {
    switch (flowState.screen) {
      case 'A1_ENTRY':
        return <EntryScreen actions={actions} />
      case 'A2_AUTHENTICATING':
        return <AuthenticatingScreen />
      case 'A3_NEW_ACCOUNT_WARNING':
        return <NewAccountWarningScreen actions={actions} />
      case 'A4_CREATE_PASSKEY':
        return <CreatePasskeyScreen activeStepIndex={flowState.progressStepIndex} />
      case 'B1_BACKUP_PROMPT':
        return <BackupPromptScreen actions={actions} />
      case 'B2_BACKUP_PROVIDER':
        return (
          <BackupProviderScreen
            providerOptions={providerOptions}
            preselectedProviderId={preselectedProviderId}
            onContinue={actions.chooseProvider}
          />
        )
      case 'B3_BACKUP_PROGRESS':
        return <BackupProgressScreen providerLabel={providerLabel} />
      case 'B4_BACKUP_SUCCESS':
        return <BackupSuccessScreen providerLabel={providerLabel} actions={actions} />
      case 'C1_RESTORE_PROVIDER':
        return <RestoreProviderScreen providerOptions={providerOptions} onSelect={actions.chooseProvider} />
      case 'C2_RESTORE_PROGRESS':
        return <RestoreProgressScreen activeStepIndex={flowState.progressStepIndex} />
      case 'C3_RESTORE_SUCCESS':
        return <RestoreSuccessScreen actions={actions} />
      case 'D1_UNSUPPORTED_BROWSER':
        return <UnsupportedBrowserScreen actions={actions} />
      case 'D2_PASSKEY_CANCELLED':
        return (
          <PasskeyCancelledScreen
            actions={actions}
            offersNewAccount={flowState.failedScreen === 'A2_AUTHENTICATING'}
          />
        )
      case 'D3_BACKUP_NOT_FOUND':
        return (
          <BackupNotFoundScreen
            providerLabel={providerLabel}
            offersOtherProvider={hasMultipleProviders}
            actions={actions}
          />
        )
      case 'D4_PROVIDER_AUTH_FAILED':
        return (
          <ProviderAuthFailedScreen
            providerLabel={providerLabel}
            offersOtherProvider={hasMultipleProviders}
            actions={actions}
          />
        )
      case 'D5_BACKUP_FAILED':
        return <BackupFailedScreen offersSkip={isExistingUser} actions={actions} />
      case 'D6_DECRYPT_FAILED':
        return <DecryptFailedScreen isAmbiguousBackup={flowState.errorCode === 'AMBIGUOUS_BACKUP'} actions={actions} />
    }
  }

  return (
    <YStack width="100%" gap="$2" data-testid={dataTestId} data-screen={flowState.screen}>
      {renderScreen()}
      <WidgetVersion name="Passkey Login" version={version} />
    </YStack>
  )
}
