import { Button, ButtonText, Card, Heading, ProgressBar, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsApiAccount } from '../../aiCreditsApi/types'
import { formatUsdMicroAmount } from '../../format'
import { CopyableValueRow } from '../shared/CopyableValueRow'
import { compactButtonProps, monospaceSingleLineStyle } from '../shared/styles'

interface ApiKeyCardProps {
  account: AiCreditsApiAccount | null
  /** True while the first account fetch is in flight, so the empty state is not shown prematurely. */
  isLoading: boolean
  /** Key operation in flight; disables the buttons so a rotate cannot be revoked mid-request. */
  isBusy: boolean
  onRotate: () => void
  onRevoke: () => void
  onBuyCredits: () => void
}

/** Formats the reset moment as a short calendar date, in UTC so every viewer sees the same day. */
function formatResetDate(resetsAtIso: string): string {
  return new Date(resetsAtIso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** Card showing the user's API key, gateway base URL and monthly spend limit, or an empty state. */
export function ApiKeyCard({ account, isLoading, isBusy, onRotate, onRevoke, onBuyCredits }: ApiKeyCardProps) {
  if (isLoading) {
    return (
      <Card>
        <Heading level={6}>API key</Heading>
        <Spinner size="sm" />
      </Card>
    )
  }

  if (!account?.apiKey) {
    return (
      <Card>
        <Heading level={6}>API key</Heading>
        <YStack gap="$2" width="100%">
          <Text fontWeight="700">No API key yet</Text>
          <Text tone="soft" fontSize="$2" lineHeight="$3">
            Buy credits to get an API key for Claude Code, Codex and other AI tools.
          </Text>
          <Button size="sm" {...compactButtonProps} onPress={onBuyCredits}>
            <ButtonText>Buy Credits</ButtonText>
          </Button>
        </YStack>
      </Card>
    )
  }

  const { apiKey, spendLimit, baseUrl, usedThisMonthUsdMicro } = account

  return (
    <Card>
      <Heading level={6}>API key</Heading>

      <YStack gap="$3" width="100%">
        <YStack gap="$1">
          <XStack justifyContent="space-between" alignItems="center" gap="$2">
            <Text fontSize="$1" tone="soft">
              Key
            </Text>
            <XStack alignItems="center" gap="$1">
              <YStack width={8} height={8} borderRadius="$full" backgroundColor="$success" />
              <Text fontSize="$1" color="$success" fontWeight="700">
                Active
              </Text>
            </XStack>
          </XStack>
          <XStack backgroundColor="$backgroundSurface" borderRadius="$2" padding="$2">
            <Text fontSize="$2" numberOfLines={1} style={monospaceSingleLineStyle}>
              {apiKey.maskedKey}
            </Text>
          </XStack>
        </YStack>

        <CopyableValueRow
          label="Base URL"
          displayValue={baseUrl}
          copyButtonLabel="Copy base URL"
        />

        {spendLimit ? (
          <YStack gap="$1">
            <ProgressBar
              label="Monthly spend limit"
              value={Number(usedThisMonthUsdMicro)}
              max={Number(spendLimit.limitUsdMicro)}
            />
            <Text fontSize="$1" tone="soft">
              {formatUsdMicroAmount(usedThisMonthUsdMicro)} of{' '}
              {formatUsdMicroAmount(spendLimit.limitUsdMicro)} used · Resets{' '}
              {formatResetDate(spendLimit.resetsAt)}
            </Text>
          </YStack>
        ) : null}

        <XStack gap="$2">
          <Button
            variant="outline"
            size="sm"
            flex={1}
            disabled={isBusy}
            {...compactButtonProps}
            onPress={onRotate}
          >
            <ButtonText>Rotate</ButtonText>
          </Button>
          <Button
            variant="outline"
            size="sm"
            flex={1}
            disabled={isBusy}
            {...compactButtonProps}
            onPress={onRevoke}
          >
            <ButtonText color="$error">Revoke</ButtonText>
          </Button>
        </XStack>
      </YStack>
    </Card>
  )
}
