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
  ButtonFrame,
  ButtonText,
  TokenAmount,
  Badge,
  BadgeText,
  Spinner,
  Separator,
  WidgetTabs,
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

const ClaimActionButton = createComponent(ButtonFrame, {
  name: 'ClaimActionButton',
  extends: 'Button',
  width: 160,
  height: 160,
  borderRadius: 9999,
  backgroundColor: '$backgroundTransparent',
  borderWidth: 0,
  shadowOpacity: 0,
  overflow: 'visible',
  position: 'relative',
  paddingHorizontal: 0,
  hoverStyle: {
    backgroundColor: '$backgroundTransparent',
  },
  pressStyle: {
    backgroundColor: '$backgroundTransparent',
    opacity: 0.95,
  },
  focusStyle: {
    backgroundColor: '$backgroundTransparent',
    outlineStyle: 'none',
  },
})

const ClaimActionGlow = createComponent(YStack, {
  name: 'ClaimActionGlow',
  position: 'absolute',
  top: -16,
  right: -16,
  bottom: -16,
  left: -16,
  borderRadius: 9999,
  backgroundColor: '$primary',
  hoverStyle: {
    backgroundColor: '$primaryLight',
  },
  opacity: 0.45,
})

const ClaimActionRing = createComponent(YStack, {
  name: 'ClaimActionRing',
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  borderRadius: 9999,
  backgroundColor: '$primary',
  hoverStyle: {
    backgroundColor: '$primaryLight',
  },
})

const ClaimActionInner = createComponent(YStack, {
  name: 'ClaimActionInner',
  position: 'absolute',
  top: 2,
  right: 2,
  bottom: 2,
  left: 2,
  borderRadius: 9999,
  backgroundColor: '$backgroundDark',
  hoverStyle: {
    backgroundColor: '$backgroundDarkHover',
  },
})

function ClaimInner() {
  const { address, connect } = useWallet()
  const { host } = useHost()
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [activeTab, setActiveTab] = useState<'claim' | 'invite-rewards' | 'news-feed'>('claim')

  const handleClaim = useCallback(async () => {
    setClaiming(true)
    // Simulate claim transaction
    await new Promise((r) => setTimeout(r, 2000))
    setClaiming(false)
    setClaimed(true)
  }, [])

  return (
    <YStack gap="$5" padding="$4">
      <WidgetTabs
        tabs={[
          { id: 'claim', label: 'Claim' },
          { id: 'invite-rewards', label: 'Invite Rewards' },
          { id: 'news-feed', label: 'News' },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId: string) =>
          setActiveTab(tabId as 'claim' | 'invite-rewards' | 'news-feed')
        }
        chainId={42220}
      />

      {activeTab === 'claim' ? (
        <>
          <ClaimCard>
            <YStack gap="$9" paddingVertical="$6">
              <YStack alignItems="center" gap="$4">
                <Text secondary>Ready to claim</Text>
                <TokenAmount token="G$" amount="193.84" size="xl" />
                <XStack gap="$2" alignItems="center">
                  <TokenAmount token="G$" amount="193.84" size="sm" variant="secondary" />
                  <TokenAmount token="G$" amount="144.13" size="sm" variant="secondary" />
                  <TokenAmount token="G$" amount="48.06" size="sm" variant="secondary" />
                </XStack>
              </YStack>

              <YStack alignItems="center" gap="$4">
                <ClaimActionButton onPress={address ? handleClaim : connect} disabled={claiming}>
                  <ClaimActionGlow
                    // GoodWalletV2 claim button uses a blurred halo around the ring.
                    style={{ filter: 'blur(20px)' }}
                  />
                  <ClaimActionRing>
                    <ClaimActionInner />
                  </ClaimActionRing>
                  <YStack
                    position="absolute"
                    top={0}
                    right={0}
                    bottom={0}
                    left={0}
                    alignItems="center"
                    justifyContent="center"
                    zIndex={1}
                    pointerEvents="none"
                  >
                    {claiming ? (
                      <XStack gap="$2" alignItems="center">
                        <Spinner size="sm" color="$grey600" />
                        <ButtonText color="$grey600">Claiming...</ButtonText>
                      </XStack>
                    ) : (
                      <ButtonText color="$primary">{address ? 'Claim' : 'Connect'}</ButtonText>
                    )}
                  </YStack>
                </ClaimActionButton>

                {claimed && (
                  <Text color="$success" fontWeight="700">
                    Claimed successfully
                  </Text>
                )}
              </YStack>

              <YStack alignItems="center" gap="$1" paddingTop="$6">
                <Text secondary>Today:</Text>
                <XStack>
                  <Text variant="caption" center secondary>
                    11.71K claimers received 2.08M G$ out of 3.2M G$ available
                  </Text>
                </XStack>
              </YStack>
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
              <TokenAmount token="G$" amount="2.08M" size="sm" variant="secondary" />
            </XStack>
          </StreakCard>

          {claimed && (
            <Button variant="secondary" fullWidth onPress={() => setClaimed(false)}>
              <ButtonText>Reset Demo</ButtonText>
            </Button>
          )}
        </>
      ) : (
        <ClaimCard>
          <YStack alignItems="center" justifyContent="center" minHeight={320}>
            <Text variant="body">Widget coming soon</Text>
          </YStack>
        </ClaimCard>
      )}
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
  themeOverrides,
  config, // We are exposing it to our demo apps but ideally config overrides should be done by widget authors and any host-level overrides done through themeOverrides
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
