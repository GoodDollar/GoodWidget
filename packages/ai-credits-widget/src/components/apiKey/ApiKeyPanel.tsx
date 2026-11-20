import { useState } from 'react'
import {
  Button,
  ButtonText,
  Icon,
  Spinner,
  Text,
  YStack,
  createDialog,
} from '@goodwidget/ui'
import type { ApiKeyActions, ApiKeyState } from '../../useApiKey'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
import { CreditsManagementCard } from '../manage/CreditsManagementCard'
import { compactButtonProps } from '../shared/styles'
import { AiCreditsStatusNotice } from '../theme/cards'
import { ApiKeyCard } from './ApiKeyCard'

interface ApiKeyPanelProps {
  state: AiCreditsWidgetAdapterState
  actions: Pick<AiCreditsWidgetAdapterActions, 'refresh'>
  apiKeyState: ApiKeyState
  apiKeyActions: ApiKeyActions
  /** False when the host configured no `aiCreditsApi`, so key management cannot work. */
  isKeyManagementAvailable: boolean
  onBuyCredits: () => void
}

/** Content of the API Key tab: credit balance, the user's key, and a refresh control. */
export function ApiKeyPanel({
  state,
  actions,
  apiKeyState,
  apiKeyActions,
  isKeyManagementAvailable,
  onBuyCredits,
}: ApiKeyPanelProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([actions.refresh(), apiKeyActions.refresh()])
    } finally {
      setRefreshing(false)
    }
  }

  // The dialog accepts synchronously so it closes at once; the card shows the busy state.
  const confirmRotate = () => {
    createDialog({
      title: 'Rotate API key?',
      body: 'Your current key stops working immediately. You will get a new key to paste into your tools.',
      acceptLabel: 'Rotate key',
      rejectLabel: 'Cancel',
      onAccept: () => {
        void apiKeyActions.rotateKey()
      },
      onReject: () => undefined,
    })
  }

  const confirmRevoke = () => {
    createDialog({
      title: 'Revoke API key?',
      body: 'Any tool using this key stops working immediately. This cannot be undone.',
      acceptLabel: 'Revoke key',
      rejectLabel: 'Cancel',
      onAccept: () => {
        void apiKeyActions.revokeKey()
      },
      onReject: () => undefined,
    })
  }

  const visibleError = apiKeyState.error ?? state.error

  return (
    <YStack gap="$3" width="100%">
      {visibleError && (
        <AiCreditsStatusNotice>
          <Text color="$error" fontSize="$2" role="alert">
            {visibleError}
          </Text>
          {apiKeyState.unfulfilledPurchase && (
            <Button
              size="sm"
              {...compactButtonProps}
              disabled={apiKeyState.pendingAction !== null}
              onPress={() => {
                void apiKeyActions.retryUnfulfilledPurchase()
              }}
            >
              <ButtonText>Try again</ButtonText>
            </Button>
          )}
        </AiCreditsStatusNotice>
      )}

      <CreditsManagementCard state={state} usedThisMonthUsdMicro={apiKeyState.account?.usedThisMonthUsdMicro ?? null} />

      {isKeyManagementAvailable ? (
        <ApiKeyCard
          account={apiKeyState.account}
          isLoading={apiKeyState.loading && apiKeyState.account === null}
          isBusy={apiKeyState.pendingAction !== null}
          onRotate={confirmRotate}
          onRevoke={confirmRevoke}
          onBuyCredits={onBuyCredits}
        />
      ) : (
        <AiCreditsStatusNotice>
          <Text fontWeight="700">API keys are coming soon</Text>
          <Text tone="soft" fontSize="$2">
            Key management is not available yet. Check back shortly.
          </Text>
        </AiCreditsStatusNotice>
      )}

      <Button
        variant="outline"
        size="sm"
        alignSelf="stretch"
        gap="$2"
        disabled={refreshing}
        {...compactButtonProps}
        onPress={() => {
          void handleRefresh()
        }}
      >
        {refreshing ? <Spinner size="sm" /> : <Icon name="refresh" size="sm" color="muted" />}
        <ButtonText>{refreshing ? 'Refreshing…' : 'Refresh Balance'}</ButtonText>
      </Button>
    </YStack>
  )
}
