import React, { useState, useCallback } from 'react'
import { useWallet } from '@goodwidget/core'
import type { GoodWidgetThemeOverrides, GoodWidgetConfig } from '@goodwidget/core'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  createComponent,
  Card,
  Button,
  ButtonFrame,
  ButtonText,
  Text,
  Spinner,
  Separator,
  XStack,
  YStack,
  TokenAmount,
  TokenInput,
} from '@goodwidget/ui'
import { useSavingsSDK, formatGDollar, toEtherNumber } from './useSavingsSDK'

// ---------------------------------------------------------------------------
// Widget-local named components
// ---------------------------------------------------------------------------

const SavingsCard = createComponent(Card, {
  name: 'SavingsCard',
  extends: 'Card',
  borderRadius: '$4',
  padding: '$4',
})

const SavingsStatCard = createComponent(Card, {
  name: 'SavingsStatCard',
  extends: 'Card',
  borderRadius: '$3',
  padding: '$3',
  gap: '$0',
})

const SavingsTabBar = createComponent(XStack, {
  name: 'SavingsTabBar',
  extends: 'Card',
  borderRadius: '$3',
  padding: '$1',
  gap: '$1',
})

const SavingsTabButton = createComponent(ButtonFrame, {
  name: 'SavingsTabButton',
  extends: 'Button',
  flex: 1,
  borderRadius: '$2',
  height: '$9',
  backgroundColor: '$backgroundTransparent',
  borderWidth: 0,
  hoverStyle: { backgroundColor: '$backgroundHover' },
  pressStyle: { backgroundColor: '$backgroundPress', opacity: 1 },
  focusStyle: { outlineStyle: 'none' },

  variants: {
    active: {
      true: {
        backgroundColor: '$background',
        hoverStyle: { backgroundColor: '$backgroundHover' },
        shadowColor: '$shadowColor',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
    },
  } as const,
})

const SavingsActionButton = createComponent(ButtonFrame, {
  name: 'SavingsActionButton',
  extends: 'Button',
  width: '100%',
  borderRadius: '$3',
  height: '$12',
  backgroundColor: '$background',
  borderWidth: 0,
  hoverStyle: { backgroundColor: '$backgroundHover' },
  pressStyle: { backgroundColor: '$backgroundPress', opacity: 0.9 },
  focusStyle: { outlineStyle: 'none' },

  variants: {
    disabled: {
      true: { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' },
    },
  } as const,
})

// ---------------------------------------------------------------------------
// Inner widget component (must live inside GoodWidgetProvider)
// ---------------------------------------------------------------------------

type SavingsTab = 'stake' | 'unstake'

function SavingsInner() {
  const { address, connect } = useWallet()
  const { globalStats, userStats, loading, error, isOnCelo, stake, unstake, claimReward } =
    useSavingsSDK()

  const [activeTab, setActiveTab] = useState<SavingsTab>('stake')
  const [inputAmount, setInputAmount] = useState('')
  const [txLoading, setTxLoading] = useState(false)
  const [claimLoading, setClaimLoading] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  const isConnected = !!address

  // Max button: fill input with available balance
  const handleMax = useCallback(() => {
    if (!userStats) return
    const val =
      activeTab === 'stake'
        ? toEtherNumber(userStats.walletBalance)
        : toEtherNumber(userStats.currentStake)
    setInputAmount(val > 0 ? val.toFixed(2) : '0')
  }, [activeTab, userStats])

  const handleStake = useCallback(async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return
    setTxLoading(true)
    setTxError(null)
    try {
      const ok = await stake(inputAmount)
      if (ok) setInputAmount('')
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Staking failed')
    } finally {
      setTxLoading(false)
    }
  }, [inputAmount, stake])

  const handleUnstake = useCallback(async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return
    setTxLoading(true)
    setTxError(null)
    try {
      const ok = await unstake(inputAmount)
      if (ok) setInputAmount('')
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Unstaking failed')
    } finally {
      setTxLoading(false)
    }
  }, [inputAmount, unstake])

  const handleClaim = useCallback(async () => {
    setClaimLoading(true)
    setTxError(null)
    try {
      await claimReward()
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Claim failed')
    } finally {
      setClaimLoading(false)
    }
  }, [claimReward])

  const handleTabChange = useCallback((tab: SavingsTab) => {
    setActiveTab(tab)
    setInputAmount('')
    setTxError(null)
  }, [])

  // Determine the balance label shown above the input
  const balanceLabel = userStats
    ? activeTab === 'stake'
      ? `Balance: ${formatGDollar(userStats.walletBalance)}`
      : `Staked: ${formatGDollar(userStats.currentStake)}`
    : undefined

  return (
    <YStack gap="$4" padding="$4">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$1">
        <Text fontFamily="$heading" fontSize="$6" fontWeight="700">
          G$ Savings
        </Text>
        {loading && !txLoading && <Spinner size="sm" />}
      </XStack>

      {/* Tab bar */}
      <SavingsTabBar>
        <SavingsTabButton active={activeTab === 'stake'} onPress={() => handleTabChange('stake')}>
          <ButtonText color={activeTab === 'stake' ? '$primary' : '$secondaryColor'}>
            Stake
          </ButtonText>
        </SavingsTabButton>
        <SavingsTabButton
          active={activeTab === 'unstake'}
          onPress={() => handleTabChange('unstake')}
        >
          <ButtonText color={activeTab === 'unstake' ? '$primary' : '$secondaryColor'}>
            Unstake
          </ButtonText>
        </SavingsTabButton>
      </SavingsTabBar>

      {/* Amount input */}
      <SavingsCard>
        <YStack gap="$3">
          <TokenInput
            token="G$"
            value={inputAmount}
            onChangeText={setInputAmount}
            balance={balanceLabel}
            onMax={isConnected ? handleMax : undefined}
          />

          {/* Unclaimed rewards row — only when connected */}
          {isConnected && userStats && (
            <>
              <Separator />
              <XStack justifyContent="space-between" alignItems="center">
                <Text variant="label" secondary>
                  Unclaimed rewards
                </Text>
                <XStack gap="$2" alignItems="center">
                  <Button
                    variant="text"
                    size="sm"
                    onPress={handleClaim}
                    disabled={claimLoading || userStats.unclaimedRewards === 0n}
                  >
                    <ButtonText color="$primary">
                      {claimLoading ? 'Claiming…' : 'Claim'}
                    </ButtonText>
                  </Button>
                  <TokenAmount
                    token="G$"
                    amount={toEtherNumber(userStats.unclaimedRewards)}
                    size="sm"
                    variant="secondary"
                  />
                </XStack>
              </XStack>
            </>
          )}
        </YStack>
      </SavingsCard>

      {/* Transaction error */}
      {(txError ?? error) && (
        <Text color="$error" fontSize="$2" textAlign="center">
          {txError ?? error}
        </Text>
      )}

      {/* Main action button */}
      {!isConnected ? (
        <SavingsActionButton onPress={connect}>
          <ButtonText>Connect Wallet</ButtonText>
        </SavingsActionButton>
      ) : !isOnCelo ? (
        <SavingsActionButton disabled>
          <ButtonText>Switch to Celo Network</ButtonText>
        </SavingsActionButton>
      ) : (
        <SavingsActionButton onPress={activeTab === 'stake' ? handleStake : handleUnstake} disabled={txLoading}>
          <XStack gap="$2" alignItems="center">
            {txLoading && <Spinner size="sm" color="$grey600" />}
            <ButtonText>
              {txLoading
                ? activeTab === 'stake'
                  ? 'Staking…'
                  : 'Unstaking…'
                : activeTab === 'stake'
                  ? 'Stake G$'
                  : 'Unstake G$'}
            </ButtonText>
          </XStack>
        </SavingsActionButton>
      )}

      {/* Staking statistics */}
      <SavingsStatCard>
        <Text variant="label" fontWeight="700" marginBottom="$2">
          Staking Statistics
        </Text>

        <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
          <Text variant="label" secondary>
            Total G$ Staked
          </Text>
          {globalStats ? (
            <TokenAmount token="G$" amount={toEtherNumber(globalStats.totalStaked)} size="sm" />
          ) : (
            <Text variant="caption" secondary>
              {loading ? '…' : '—'}
            </Text>
          )}
        </XStack>

        <Separator />

        <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
          <Text variant="label" secondary>
            Annual APR
          </Text>
          <Text fontWeight="600">
            {globalStats ? `${globalStats.annualAPR.toFixed(2)}%` : loading ? '…' : '—'}
          </Text>
        </XStack>

        {isConnected && userStats && (
          <>
            <Separator />
            <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
              <Text variant="label" secondary>
                Your Stake
              </Text>
              <TokenAmount
                token="G$"
                amount={toEtherNumber(userStats.currentStake)}
                size="sm"
                variant="secondary"
              />
            </XStack>

            <Separator />

            <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
              <Text variant="label" secondary>
                Weekly Rewards
              </Text>
              <TokenAmount
                token="G$"
                amount={toEtherNumber(userStats.userWeeklyRewards)}
                size="sm"
                variant="secondary"
              />
            </XStack>
          </>
        )}
      </SavingsStatCard>
    </YStack>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface SavingsWidgetProps {
  provider?: EIP1193Provider
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
}

/**
 * The Savings Widget — a complete mini app for staking G$ and earning rewards.
 *
 * Backed by the GoodDollar savings staking contract on Celo mainnet via
 * `@goodwidget/savings-sdk`.
 *
 * Can be used directly as a React component:
 *   <SavingsWidget provider={eip1193} />
 *
 * Or wrapped into a Web Component via the `element` or `register` entry points.
 */
export function SavingsWidget({
  provider,
  themeOverrides,
  config,
  defaultTheme = 'light',
}: SavingsWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <SavingsInner />
    </GoodWidgetProvider>
  )
}
