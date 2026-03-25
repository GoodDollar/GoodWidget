import React, { useState, useCallback } from 'react'
import { useWallet, useHost } from '@goodwidget/core'
import type { GoodWidgetThemeOverrides, GoodWidgetConfig } from '@goodwidget/core'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  createComponent,
  Card,
  Heading,
  Text,
  Button,
  ButtonText,
  TokenAmount,
  Badge,
  BadgeText,
  Spinner,
  Separator,
  XStack,
  YStack,
} from '@goodwidget/ui'

const ClaimCard = createComponent(Card, {
  name: 'ClaimCard',
  extends: 'Card',
  borderRadius: '$4',
  padding: '$4',
})

const StreakCard = createComponent(Card, {
  name: 'StreakCard',
  extends: 'Card',
  borderRadius: '$3',
  padding: '$3',
})

function ClaimInner() {
  const { address, connect } = useWallet()
  const { host } = useHost()
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)

  const handleClaim = useCallback(async () => {
    setClaiming(true)
    // Simulate claim transaction
    await new Promise((r) => setTimeout(r, 2000))
    setClaiming(false)
    setClaimed(true)
  }, [])

  return (
    <YStack gap="$3" padding="$2">
      <ClaimCard>
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Heading level={5}>Claim G$</Heading>
            <Badge type="info">
              <BadgeText>{host}</BadgeText>
            </Badge>
          </XStack>

          <Text secondary>Daily UBI available</Text>

          <TokenAmount token="G$" amount="142.50" size="lg" />

          {claimed ? (
            <YStack gap="$2" alignItems="center">
              <Text color="$success" fontWeight="700">
                Claimed successfully!
              </Text>
              <Button
                variant="secondary"
                fullWidth
                onPress={() => setClaimed(false)}
              >
                <ButtonText>Reset Demo</ButtonText>
              </Button>
            </YStack>
          ) : (
            <Button
              fullWidth
              onPress={address ? handleClaim : connect}
              disabled={claiming}
            >
              {claiming ? (
                <XStack gap="$2" alignItems="center">
                  <Spinner size="sm" />
                  <ButtonText>Claiming...</ButtonText>
                </XStack>
              ) : (
                <ButtonText>
                  {address ? 'Claim Now' : 'Connect to Claim'}
                </ButtonText>
              )}
            </Button>
          )}
        </YStack>
      </ClaimCard>

      <StreakCard>
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Streak</Text>
          <Badge type="success">
            <BadgeText>12 days</BadgeText>
          </Badge>
        </XStack>
      </StreakCard>

      <StreakCard>
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Next claim in</Text>
          <Text fontWeight="600">23h 14m</Text>
        </XStack>
        <Separator marginVertical="$2" />
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Total claimed</Text>
          <TokenAmount token="G$" amount="4,280.00" size="sm" />
        </XStack>
      </StreakCard>
    </YStack>
  )
}

export interface ClaimWidgetProps {
  provider?: EIP1193Provider
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
}

/**
 * The Claim Widget — a complete mini app for claiming GoodDollar UBI.
 *
 * Can be used directly as a React component:
 *   <ClaimWidget provider={eip1193} />
 *
 * Or wrapped into a Web Component via the `element` or `register` entry points.
 */
export function ClaimWidget({
  provider,
  config,
  themeOverrides,
  defaultTheme = 'light',
}: ClaimWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <ClaimInner />
    </GoodWidgetProvider>
  )
}
