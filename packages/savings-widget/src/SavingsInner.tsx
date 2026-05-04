import React, { useState, useCallback } from 'react'
import { useWallet } from '@goodwidget/core'
import {
  createComponent,
  Card,
  Heading,
  Text,
  ButtonFrame,
  ButtonText,
  Spinner,
  Separator,
  XStack,
  YStack,
  TokenAmount,
  TokenInput,
  createToast,
  updateToast,
  ToastContainer,
  Icon,
} from '@goodwidget/ui'
import { parseEther, formatEther } from 'viem'
import { formatG$ } from '@goodwidget/savings-sdk'
import { useSavingsSDK } from './useSavingsSDK'

/** Convert bigint wei to a plain decimal string suitable for TokenAmount (no locale commas). */
function toEtherStr(amount: bigint, decimals = 2): string {
  const n = Number(formatEther(amount))
  return n.toFixed(decimals)
}

// ---------------------------------------------------------------------------
// Styled sub-components
// ---------------------------------------------------------------------------

const SavingsCard = createComponent(Card, {
  name: 'SavingsCard',
  extends: 'Card',
  borderRadius: '$4',
  padding: '$4',
})

const StatsCard = createComponent(Card, {
  name: 'SavingsStatsCard',
  extends: 'Card',
  borderRadius: '$3',
  padding: '$3',
})

const TabButton = createComponent(ButtonFrame, {
  name: 'SavingsTabButton',
  extends: 'Button',
  flex: 1,
  alignItems: 'center',
  paddingVertical: '$2',
  borderBottomWidth: 2,
  borderColor: '$backgroundTransparent',
  borderRadius: 0,
  backgroundColor: '$backgroundTransparent',
  hoverStyle: { backgroundColor: '$backgroundTransparent' },
  pressStyle: { backgroundColor: '$backgroundTransparent', opacity: 0.8 },
  focusStyle: { outlineStyle: 'none' },
})

const ActionButton = createComponent(ButtonFrame, {
  name: 'SavingsActionButton',
  extends: 'Button',
  width: '100%',
  borderRadius: '$3',
  paddingVertical: '$4',
  backgroundColor: '$primary',
  alignItems: 'center',
  justifyContent: 'center',
  hoverStyle: { backgroundColor: '$primaryLight' },
  pressStyle: { opacity: 0.85, backgroundColor: '$primary' },
  focusStyle: { outlineStyle: 'none' },
  disabledStyle: { opacity: 0.5 },
})

const ClaimButton = createComponent(YStack, {
  name: 'SavingsClaimButton',
  tag: 'button',
  cursor: 'pointer',
  paddingHorizontal: '$2',
  borderWidth: 0,
  backgroundColor: '$backgroundTransparent',
  outlineWidth: 0,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Tab = 'stake' | 'unstake'

function validateAmount(value: string, max: bigint): string | null {
  if (!value || !value.trim() || value === '0' || value === '0.0') return null
  if (!/^[0-9]*\.?[0-9]*$/.test(value)) return 'Invalid amount'
  const num = parseFloat(value)
  if (isNaN(num) || num <= 0) return 'Invalid amount'
  try {
    const wei = parseEther(value as `${number}`)
    if (wei > max) return 'Exceeds available balance'
  } catch {
    return 'Invalid amount'
  }
  return null
}

// ---------------------------------------------------------------------------
// Inner widget — rendered inside GoodWidgetProvider
// ---------------------------------------------------------------------------

export function SavingsInner() {
  const { address, connect } = useWallet()
  const { status, sdk, globalStats, userStats, refresh, error } = useSavingsSDK()

  const [tab, setTab] = useState<Tab>('stake')
  const [amount, setAmount] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [txPending, setTxPending] = useState(false)
  const [claimPending, setClaimPending] = useState(false)

  const isConnected = !!address
  const isLoading = status === 'loading'

  const maxForTab = tab === 'stake' ? (userStats?.walletBalance ?? 0n) : (userStats?.currentStake ?? 0n)

  const handleAmountChange = useCallback(
    (val: string) => {
      setAmount(val)
      setInputError(validateAmount(val, maxForTab))
    },
    [maxForTab],
  )

  const handleMax = useCallback(() => {
    // Use formatEther directly to avoid precision loss from Number() conversion on large bigints
    const maxStr = maxForTab > 0n ? formatEther(maxForTab) : '0'
    setAmount(maxStr)
    setInputError(null)
  }, [maxForTab])

  const handleTabChange = useCallback((next: Tab) => {
    setTab(next)
    setAmount('')
    setInputError(null)
  }, [])

  const handleAction = useCallback(async () => {
    if (!sdk || !isConnected) return
    const err = validateAmount(amount, maxForTab)
    if (err) {
      setInputError(err)
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      setInputError('Please enter an amount')
      return
    }

    setTxPending(true)
    const toastId = createToast({
      message: tab === 'stake' ? 'Staking…' : 'Unstaking…',
      status: 'pending',
      duration: 0,
    })

    try {
      const wei = parseEther(amount as `${number}`)
      if (tab === 'stake') {
        await sdk.stake(wei)
      } else {
        await sdk.unstake(wei)
      }
      await refresh()
      setAmount('')
      setInputError(null)
      updateToast(toastId, {
        message: tab === 'stake' ? 'Staked successfully!' : 'Unstaked successfully!',
        status: 'success',
        duration: 4000,
      })
    } catch (e) {
      updateToast(toastId, {
        message: e instanceof Error ? e.message : 'Transaction failed',
        status: 'error',
        duration: 6000,
      })
    } finally {
      setTxPending(false)
    }
  }, [sdk, isConnected, amount, tab, maxForTab, refresh])

  const handleClaim = useCallback(async () => {
    if (!sdk || !isConnected) return
    setClaimPending(true)
    const toastId = createToast({ message: 'Claiming rewards…', status: 'pending', duration: 0 })
    try {
      await sdk.claimReward()
      await refresh()
      updateToast(toastId, { message: 'Rewards claimed!', status: 'success', duration: 4000 })
    } catch (e) {
      updateToast(toastId, {
        message: e instanceof Error ? e.message : 'Claim failed',
        status: 'error',
        duration: 6000,
      })
    } finally {
      setClaimPending(false)
    }
  }, [sdk, isConnected, refresh])

  return (
    <YStack gap="$5" padding="$4">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$1">
        <Heading level={4}>GoodDollar Savings</Heading>
        {isConnected && (
          <Text variant="caption" secondary>
            APR: {globalStats ? `${globalStats.annualAPR.toFixed(2)}%` : '—'}
          </Text>
        )}
      </XStack>

      {/* Tabs */}
      <XStack borderBottomWidth={1} borderColor="$borderColor" alignItems="center">
        {(['stake', 'unstake'] as Tab[]).map((t) => (
          <TabButton
            key={t}
            borderColor={tab === t ? '$borderColorFocus' : '$backgroundTransparent'}
            onPress={() => handleTabChange(t)}
          >
            <Text variant="label" color={tab === t ? '$primary' : '$placeholderColor'}>
              {t === 'stake' ? 'Stake' : 'Unstake'}
            </Text>
          </TabButton>
        ))}
      </XStack>

      {/* Main card */}
      <SavingsCard>
        <YStack gap="$4">
          {/* Amount input */}
          <TokenInput
            value={amount}
            onChangeText={handleAmountChange}
            token="G$"
            balance={
              isConnected
                ? isLoading
                  ? 'Loading…'
                  : tab === 'stake'
                    ? formatG$(userStats?.walletBalance ?? 0n)
                    : formatG$(userStats?.currentStake ?? 0n)
                : undefined
            }
            onMax={isConnected ? handleMax : undefined}
          />

          {inputError && (
            <XStack gap="$1" alignItems="center">
              <Icon name="alert-circle" size="xs" color="error" />
              <Text variant="caption" color="$error">
                {inputError}
              </Text>
            </XStack>
          )}

          {error && (
            <Text variant="caption" color="$error">
              {error}
            </Text>
          )}

          {/* Rewards row — shown when connected and there are unclaimed rewards */}
          {isConnected && userStats && userStats.unclaimedRewards > 0n && (
            <XStack justifyContent="space-between" alignItems="center">
              <Text variant="label" secondary>
                Unclaimed Rewards
              </Text>
              <XStack gap="$2" alignItems="center">
                <ClaimButton onPress={handleClaim} disabled={claimPending}>
                  {claimPending ? (
                    <Spinner size="sm" />
                  ) : (
                    <Text fontWeight="600" color="$primary" style={{ textDecorationLine: 'underline' }}>
                      Claim
                    </Text>
                  )}
                </ClaimButton>
                <TokenAmount token="G$" amount={toEtherStr(userStats.unclaimedRewards)} size="sm" />
              </XStack>
            </XStack>
          )}

          {/* Action button */}
          {!isConnected ? (
            <ActionButton onPress={connect}>
              <ButtonText color="white" fontWeight="600">
                Connect Wallet
              </ButtonText>
            </ActionButton>
          ) : (
            <ActionButton onPress={handleAction} disabled={txPending || isLoading}>
              {txPending ? (
                <XStack gap="$2" alignItems="center">
                  <Spinner size="sm" color="white" />
                  <ButtonText color="white" fontWeight="600">
                    {tab === 'stake' ? 'Staking…' : 'Unstaking…'}
                  </ButtonText>
                </XStack>
              ) : (
                <ButtonText color="white" fontWeight="600">
                  {tab === 'stake' ? 'Stake' : 'Unstake'}
                </ButtonText>
              )}
            </ActionButton>
          )}
        </YStack>
      </SavingsCard>

      {/* Statistics */}
      <StatsCard>
        <YStack gap="$1">
          <Text variant="label" fontWeight="600">
            Staking Statistics
          </Text>
          <Separator marginVertical="$2" />

          <XStack justifyContent="space-between" alignItems="center" paddingVertical="$1">
            <Text secondary>Total G$ Staked</Text>
            {isLoading ? (
              <Spinner size="sm" />
            ) : globalStats ? (
              <TokenAmount token="G$" amount={toEtherStr(globalStats.totalStaked, 0)} size="sm" />
            ) : (
              <Text secondary>—</Text>
            )}
          </XStack>

          <XStack justifyContent="space-between" alignItems="center" paddingVertical="$1">
            <Text secondary>Annual APR</Text>
            <Text fontWeight="600">
              {isLoading ? '…' : globalStats ? `${globalStats.annualAPR.toFixed(2)}%` : '—'}
            </Text>
          </XStack>

          {isConnected && (
            <>
              <XStack justifyContent="space-between" alignItems="center" paddingVertical="$1">
                <Text secondary>Your Stake</Text>
                {isLoading ? (
                  <Spinner size="sm" />
                ) : userStats ? (
                  <TokenAmount token="G$" amount={toEtherStr(userStats.currentStake)} size="sm" variant="secondary" />
                ) : (
                  <Text secondary>—</Text>
                )}
              </XStack>

              <XStack justifyContent="space-between" alignItems="center" paddingVertical="$1">
                <Text secondary>Weekly Rewards</Text>
                {isLoading ? (
                  <Spinner size="sm" />
                ) : userStats ? (
                  <TokenAmount token="G$" amount={toEtherStr(userStats.userWeeklyRewards)} size="sm" variant="secondary" />
                ) : (
                  <Text secondary>—</Text>
                )}
              </XStack>
            </>
          )}
        </YStack>
      </StatsCard>

      <ToastContainer />
    </YStack>
  )
}
