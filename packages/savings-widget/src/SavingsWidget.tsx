import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { GoodWidgetProvider, useWallet } from '@goodwidget/core'
import type {
  EIP1193Provider,
  GoodWidgetConfig,
  GoodWidgetThemeOverrides,
} from '@goodwidget/core'
import {
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Card,
  Heading,
  Spinner,
  Text,
  TokenInput,
  ToastContainer,
  XStack,
  YStack,
  createToast,
  updateToast,
} from '@goodwidget/ui'
import { GooddollarSavingsSDK } from '@goodsdks/savings-sdk'
import { createPublicClient, createWalletClient, custom, formatEther, http, parseEther } from 'viem'
import { celo } from 'viem/chains'

export type SavingsTab = 'deposit' | 'withdraw'

interface SavingsWidgetInnerProps {
  connectWallet?: () => void
  refreshIntervalMs: number
}

interface SavingsGlobalStats {
  totalStaked: bigint
  annualAPR: number
}

interface SavingsUserStats {
  walletBalance: bigint
  currentStake: bigint
  unclaimedRewards: bigint
  userWeeklyRewards: bigint
}

const DEFAULT_GLOBAL_STATS: SavingsGlobalStats = {
  totalStaked: 0n,
  annualAPR: 0,
}

const DEFAULT_USER_STATS: SavingsUserStats = {
  walletBalance: 0n,
  currentStake: 0n,
  unclaimedRewards: 0n,
  userWeeklyRewards: 0n,
}

type SavingsSdkPublicClient = ConstructorParameters<typeof GooddollarSavingsSDK>[0]
type SavingsSdkWalletClient = ConstructorParameters<typeof GooddollarSavingsSDK>[1]

function formatTokenAmount(value: bigint): string {
  return Number(formatEther(value)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

function parseAmount(value: string): bigint | null {
  if (!value.trim()) return null
  try {
    return parseEther(value)
  } catch {
    return null
  }
}

function SavingsWidgetInner({ connectWallet, refreshIntervalMs }: SavingsWidgetInnerProps) {
  const { address, connect, isConnected, provider } = useWallet()
  const [activeTab, setActiveTab] = useState<SavingsTab>('deposit')
  const [inputAmount, setInputAmount] = useState('')
  const [globalStats, setGlobalStats] = useState<SavingsGlobalStats>(DEFAULT_GLOBAL_STATS)
  const [userStats, setUserStats] = useState<SavingsUserStats>(DEFAULT_USER_STATS)
  const [loading, setLoading] = useState(true)
  const [txPending, setTxPending] = useState(false)
  const [claimPending, setClaimPending] = useState(false)
  const [sdkError, setSdkError] = useState<string | null>(null)

  const connected = Boolean(isConnected && provider && address)

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: celo,
        transport: http(),
      }),
    [],
  )

  const walletClient = useMemo(() => {
    if (!provider || !connected) return null
    return createWalletClient({
      chain: celo,
      transport: custom(provider),
    })
  }, [provider, connected])

  const [sdk, setSdk] = useState<GooddollarSavingsSDK | null>(null)

  useEffect(() => {
    try {
      const sdkPublicClient = publicClient as SavingsSdkPublicClient
      const sdkWalletClient = walletClient as SavingsSdkWalletClient
      const nextSdk = walletClient
        ? new GooddollarSavingsSDK(sdkPublicClient, sdkWalletClient)
        : new GooddollarSavingsSDK(sdkPublicClient)
      setSdk(nextSdk)
      setSdkError(null)
    } catch (error) {
      setSdk(null)
      setSdkError(error instanceof Error ? error.message : 'Failed to initialize savings SDK')
    }
  }, [publicClient, walletClient])

  const refreshData = useCallback(async () => {
    if (!sdk) return

    setLoading(true)
    try {
      const stats = await sdk.getGlobalStats()
      setGlobalStats(stats)

      if (connected) {
        const userStatsResult = await sdk.getUserStats()
        setUserStats(userStatsResult)
      } else {
        setUserStats(DEFAULT_USER_STATS)
      }

      setSdkError(null)
    } catch (error) {
      setSdkError(error instanceof Error ? error.message : 'Failed to fetch savings data')
    } finally {
      setLoading(false)
    }
  }, [sdk, connected])

  useEffect(() => {
    void refreshData()
  }, [refreshData])

  useEffect(() => {
    if (refreshIntervalMs <= 0) return
    const interval = setInterval(() => {
      void refreshData()
    }, refreshIntervalMs)

    return () => {
      clearInterval(interval)
    }
  }, [refreshData, refreshIntervalMs])

  const selectedBalance = activeTab === 'deposit' ? userStats.walletBalance : userStats.currentStake
  const parsedAmount = parseAmount(inputAmount)

  const inputError = useMemo(() => {
    if (!inputAmount.trim()) return null
    if (!parsedAmount) return 'Invalid amount'
    if (parsedAmount <= 0n) return 'Amount must be greater than zero'
    if (parsedAmount > selectedBalance) {
      return activeTab === 'deposit' ? 'Insufficient wallet balance' : 'Amount exceeds staked balance'
    }
    return null
  }, [activeTab, inputAmount, parsedAmount, selectedBalance])

  const handleConnect = useCallback(async () => {
    if (connectWallet) {
      connectWallet()
      return
    }
    await connect()
  }, [connect, connectWallet])

  const handleSetMax = useCallback(() => {
    setInputAmount(formatEther(selectedBalance))
  }, [selectedBalance])

  const handleDepositWithdraw = useCallback(async () => {
    if (!sdk || !parsedAmount || inputError) return

    const actionLabel = activeTab === 'deposit' ? 'deposit' : 'withdrawal'
    const toastId = createToast({ message: `Submitting ${actionLabel}...`, status: 'pending', duration: 0 })

    try {
      setTxPending(true)
      if (activeTab === 'deposit') {
        await sdk.stake(parsedAmount)
      } else {
        await sdk.unstake(parsedAmount)
      }
      updateToast(toastId, {
        message: `${activeTab === 'deposit' ? 'Deposit' : 'Withdrawal'} completed`,
        status: 'success',
        duration: 4000,
      })
      setInputAmount('')
      await refreshData()
    } catch (error) {
      updateToast(toastId, {
        message: error instanceof Error ? error.message : `Failed to process ${actionLabel}`,
        status: 'error',
        duration: 5000,
      })
    } finally {
      setTxPending(false)
    }
  }, [activeTab, inputError, parsedAmount, refreshData, sdk])

  const handleClaimRewards = useCallback(async () => {
    if (!sdk || userStats.unclaimedRewards <= 0n) return

    const toastId = createToast({ message: 'Claiming rewards...', status: 'pending', duration: 0 })

    try {
      setClaimPending(true)
      await sdk.claimReward()
      updateToast(toastId, {
        message: 'Rewards claimed',
        status: 'success',
        duration: 4000,
      })
      await refreshData()
    } catch (error) {
      updateToast(toastId, {
        message: error instanceof Error ? error.message : 'Failed to claim rewards',
        status: 'error',
        duration: 5000,
      })
    } finally {
      setClaimPending(false)
    }
  }, [refreshData, sdk, userStats.unclaimedRewards])

  return (
    <YStack width="100%" maxWidth={460} gap="$3" data-testid="SavingsWidget-default">
      <Card elevated>
        <XStack justifyContent="space-between" alignItems="center">
          <Heading level={4}>GoodDollar Savings</Heading>
          <Badge type="info">
            <BadgeText>Celo</BadgeText>
          </Badge>
        </XStack>

        <XStack gap="$2">
          <Button
            fullWidth
            variant={activeTab === 'deposit' ? 'primary' : 'secondary'}
            onPress={() => setActiveTab('deposit')}
            disabled={txPending || claimPending}
          >
            <ButtonText>Deposit</ButtonText>
          </Button>
          <Button
            fullWidth
            variant={activeTab === 'withdraw' ? 'primary' : 'secondary'}
            onPress={() => setActiveTab('withdraw')}
            disabled={txPending || claimPending}
          >
            <ButtonText>Withdraw</ButtonText>
          </Button>
        </XStack>

        {loading ? (
          <YStack alignItems="center" justifyContent="center" paddingVertical="$8">
            <Spinner size="lg" />
          </YStack>
        ) : !connected ? (
          <YStack gap="$3">
            <Text secondary>Connect your wallet to deposit and withdraw G$ from savings.</Text>
            <Button fullWidth onPress={() => void handleConnect()}>
              <ButtonText>Connect Wallet</ButtonText>
            </Button>
          </YStack>
        ) : (
          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <Text secondary>
                {activeTab === 'deposit' ? 'Wallet Balance' : 'Staked Balance'}: {formatTokenAmount(selectedBalance)} G$
              </Text>
            </XStack>

            <TokenInput
              value={inputAmount}
              onChangeText={setInputAmount}
              token="G$"
              balance={formatTokenAmount(selectedBalance)}
              onMax={handleSetMax}
            />

            {inputError && <Text color="$error">{inputError}</Text>}

            <Button
              fullWidth
              onPress={() => void handleDepositWithdraw()}
              disabled={txPending || claimPending || !!inputError || !parsedAmount}
            >
              <ButtonText>
                {txPending ? 'Processing...' : activeTab === 'deposit' ? 'Deposit to Savings' : 'Withdraw from Savings'}
              </ButtonText>
            </Button>

            <XStack justifyContent="space-between" alignItems="center">
              <Text secondary>Unclaimed rewards</Text>
              <Button
                variant="text"
                onPress={() => void handleClaimRewards()}
                disabled={claimPending || userStats.unclaimedRewards <= 0n}
              >
                <ButtonText>{claimPending ? 'Claiming...' : 'Claim'}</ButtonText>
              </Button>
            </XStack>
            <Text>{formatTokenAmount(userStats.unclaimedRewards)} G$</Text>
          </YStack>
        )}

        {sdkError && <Text color="$error">{sdkError}</Text>}
      </Card>

      <Card outlined>
        <Heading level={5}>Savings statistics</Heading>
        <XStack justifyContent="space-between">
          <Text secondary>Total G$ staked</Text>
          <Text>{formatTokenAmount(globalStats.totalStaked)} G$</Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text secondary>Annual APR</Text>
          <Text>{formatPercent(globalStats.annualAPR)}</Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text secondary>Your current stake</Text>
          <Text>{formatTokenAmount(userStats.currentStake)} G$</Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text secondary>Your weekly rewards</Text>
          <Text>{formatTokenAmount(userStats.userWeeklyRewards)} G$</Text>
        </XStack>
      </Card>

      <ToastContainer />
    </YStack>
  )
}

export interface SavingsWidgetProps {
  provider?: EIP1193Provider
  connectWallet?: () => void
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
  refreshIntervalMs?: number
}

export function SavingsWidget({
  provider,
  connectWallet,
  themeOverrides,
  config,
  defaultTheme = 'light',
  refreshIntervalMs = 30_000,
}: SavingsWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <SavingsWidgetInner connectWallet={connectWallet} refreshIntervalMs={refreshIntervalMs} />
    </GoodWidgetProvider>
  )
}
