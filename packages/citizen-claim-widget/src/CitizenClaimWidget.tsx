import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  createComponent,
  Card,
  Heading,
  Text,
  Anchor,
  Button,
  ButtonFrame,
  ButtonText,
  TokenAmount,
  Spinner,
  Separator,
  ToastContainer,
  createToast,
  updateToast,
  XStack,
  YStack,
  WidgetTabs,
} from '@goodwidget/ui'
import { SupportedChains } from '@goodsdks/citizen-sdk'
import { useCitizenClaimAdapter } from './adapter'
import { ClaimInviteJoinCard, InviteRewards } from './InviteRewards'
import { InviteRuntimeProvider } from './inviteAdapter'
import type {
  CitizenClaimWidgetProps,
  CitizenClaimWidgetSuccessDetail,
  CitizenClaimWidgetErrorDetail,
  CitizenClaimWidgetEnvironment,
} from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// Named styled components — these participate in the component sub-theme system.
// Integrators can override light_ClaimCard, dark_ClaimCard etc. in themeOverrides.
// ---------------------------------------------------------------------------

/** Primary card wrapping the claim amount and action button. */
const ClaimCard = createComponent(Card, {
  name: 'ClaimCard',
  extends: 'Card',
  borderRadius: '$4',
  padding: '$4',
})

/** Circular action button that mirrors the GoodWalletV2 claim button design. */
const ClaimActionButton = createComponent(ButtonFrame, {
  name: 'ClaimActionButton',
  extends: 'Button',
  width: 160,
  height: 160,
  borderRadius: 9999,
  backgroundColor: '$backgroundTransparent',
  borderWidth: 0,
  shadowOpacity: 0,
  overflow: 'visible' as const,
  position: 'relative' as const,
  paddingHorizontal: 0,
  hoverStyle: { backgroundColor: '$backgroundTransparent' },
  pressStyle: { backgroundColor: '$backgroundTransparent', opacity: 0.95 },
  focusStyle: { backgroundColor: '$backgroundTransparent', outlineStyle: 'none' },
})

/** Blurred halo glow layer behind the action ring. */
const ClaimActionGlow = createComponent(YStack, {
  name: 'ClaimActionGlow',
  position: 'absolute' as const,
  top: -16,
  right: -16,
  bottom: -16,
  left: -16,
  borderRadius: 9999,
  backgroundColor: '$primary',
  opacity: 0.45,
})

/** Solid ring forming the outer rim of the action button. */
const ClaimActionRing = createComponent(YStack, {
  name: 'ClaimActionRing',
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  borderRadius: 9999,
  backgroundColor: '$primary',
})

/** Dark inner circle inside the action ring. */
const ClaimActionInner = createComponent(YStack, {
  name: 'ClaimActionInner',
  position: 'absolute' as const,
  top: 2,
  right: 2,
  bottom: 2,
  left: 2,
  borderRadius: 9999,
  backgroundColor: '$backgroundDark',
})

/** Vertical container for the per-chain claim breakdown area. */
const ClaimChainBreakdown = createComponent(YStack, {
  name: 'ClaimChainBreakdown',
  alignItems: 'center' as const,
  gap: '$2',
})

/** Row wrapping all chain entries (allows wrapping on smaller widths). */
const ClaimChainList = createComponent(XStack, {
  name: 'ClaimChainList',
  flexWrap: 'wrap' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  columnGap: '$2',
  rowGap: '$1',
  paddingHorizontal: '$4',
})

/** Single chain entry: amount + chain label (+ separator rendered externally). */
const ClaimChainItem = createComponent(XStack, {
  name: 'ClaimChainItem',
  alignItems: 'center' as const,
  gap: '$1',
})

/** Footer wrapper for daily claim stats block. */
const ClaimDailyStats = createComponent(YStack, {
  name: 'ClaimDailyStats',
  alignItems: 'center' as const,
  gap: '$1',
  paddingTop: '$3',
})

/** Single centered stats row (matches GoodWalletV2 footer row behavior). */
const ClaimDailyStatsRow = createComponent(Text, {
  name: 'ClaimDailyStatsRow',
  width: '100%' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  gap: '$2',
  display: 'flex' as const,
})

function getChainName(chainId: number): string {
  switch (chainId) {
    case SupportedChains.FUSE:
      return 'Fuse'
    case SupportedChains.CELO:
      return 'Celo'
    case SupportedChains.XDC:
      return 'XDC'
    default:
      return `Chain ${chainId}`
  }
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
    notation: 'compact',
  }).format(value)
}

// ---------------------------------------------------------------------------
// Countdown — shows HH:MM:SS until the next claimable period.
// ---------------------------------------------------------------------------
function Countdown({ nextClaim }: { nextClaim: Date }) {
  const getTimeLeft = () => Math.max(0, Math.floor((nextClaim.getTime() - Date.now()) / 1000))
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(id)
    // getTimeLeft reads `nextClaim` only; intentionally excluded from deps.
  }, [nextClaim])

  const h = Math.floor(timeLeft / 3600)
    .toString()
    .padStart(2, '0')
  const m = Math.floor((timeLeft % 3600) / 60)
    .toString()
    .padStart(2, '0')
  const s = (timeLeft % 60).toString().padStart(2, '0')

  return <>{`${h}:${m}:${s}`}</>
}

// ---------------------------------------------------------------------------
// Inner component — must live inside GoodWidgetProvider so it can use useWallet.
// ---------------------------------------------------------------------------
interface CitizenClaimInnerProps {
  environment?: CitizenClaimWidgetEnvironment
  // walletMode: 'custodial' | 'injected'
  onClaimSuccess?: (detail: CitizenClaimWidgetSuccessDetail) => void
  onClaimError?: (detail: CitizenClaimWidgetErrorDetail) => void
}

function CitizenClaimInner({ environment, onClaimSuccess, onClaimError }: CitizenClaimInnerProps) {
  const { state, actions } = useCitizenClaimAdapter({ environment })
  const {
    status,
    address,
    chainId,
    amount,
    primaryAction,
    primaryLabel,
    error,
    nextClaimTime,
    claimablesByChain,
    dailyStats,
  } = state

  const isPending = status === 'claiming' || status === 'loading' || status === 'connecting'
  const totalClaimableAmount = claimablesByChain.reduce(
    (sum, item) => sum + (Number.parseFloat(item.amount) || 0),
    0,
  )
  const displayAmount = claimablesByChain.length > 0 ? totalClaimableAmount.toFixed(2) : amount
  const chainNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const entry of claimablesByChain) {
      map.set(entry.chainId, getChainName(entry.chainId))
    }
    return map
  }, [claimablesByChain])

  /** Dispatch the primary action and surface callbacks for claim outcomes. */
  const handlePrimaryAction = useCallback(async () => {
    try {
      switch (primaryAction) {
        case 'connect':
          await actions.connect()
          break
        case 'verify':
          await actions.startVerification()
          break
        case 'claim': {
          const claimPlan = [...claimablesByChain]
          if (claimPlan.length === 0) {
            const singleChainName = chainId ? getChainName(chainId) : 'active chain'
            const toastId = createToast({
              message: `Claim initiated on ${singleChainName}`,
              status: 'pending',
              duration: 0,
            })

            try {
              const receipt = await actions.claim()
              updateToast(toastId, {
                message: `Claim succeeded on ${singleChainName}`,
                status: 'success',
                duration: 3200,
              })
              onClaimSuccess?.({
                address: address!,
                chainId: chainId!,
                transactionHash: (receipt as { transactionHash?: string } | undefined)
                  ?.transactionHash,
              })
            } catch (singleClaimError: unknown) {
              updateToast(toastId, {
                message: `Claim failed on ${singleChainName}`,
                status: 'error',
                duration: 0,
              })
              onClaimError?.({
                address: address ?? null,
                chainId: chainId ?? null,
                message:
                  singleClaimError instanceof Error ? singleClaimError.message : 'Claim failed',
              })
            }
            break
          }

          for (const claimEntry of claimPlan) {
            const entryChainName =
              chainNameById.get(claimEntry.chainId) ?? getChainName(claimEntry.chainId)
            const toastId = createToast({
              message: `Claim initiated on ${entryChainName}`,
              status: 'pending',
              duration: 0,
            })

            try {
              const receipt = await actions.claimOnChain(claimEntry.chainId)
              updateToast(toastId, {
                message: `Claim succeeded on ${entryChainName}`,
                status: 'success',
                duration: 3200,
              })
              onClaimSuccess?.({
                address: address!,
                chainId: claimEntry.chainId,
                transactionHash: (receipt as { transactionHash?: string } | undefined)
                  ?.transactionHash,
              })
            } catch (multiClaimError: unknown) {
              updateToast(toastId, {
                message: `Claim failed on ${entryChainName}`,
                status: 'error',
                duration: 0,
              })
              onClaimError?.({
                address: address ?? null,
                chainId: claimEntry.chainId,
                message:
                  multiClaimError instanceof Error ? multiClaimError.message : 'Claim failed',
              })
            } finally {
            }
          }

          await actions.refresh()
          break
        }
        case 'refresh':
          await actions.refresh()
          break
        case 'switch_chain':
          // Default to Celo (42220) as the first preferred supported chain
          await actions.switchChain?.(42220)
          break
      }
    } catch (err: unknown) {
      if (primaryAction === 'claim') {
        onClaimError?.({
          address: address ?? null,
          chainId: chainId ?? null,
          message: err instanceof Error ? err.message : 'Claim failed',
        })
      }
    }
  }, [
    primaryAction,
    actions,
    address,
    chainId,
    chainNameById,
    claimablesByChain,
    onClaimSuccess,
    onClaimError,
  ])

  return (
    <YStack gap="$5" padding="$4">
      {status === 'not_whitelisted' && (
        <ClaimCard>
          <YStack gap="$4" padding="$6" alignItems="center" width="100%">
            <Heading level={3} textAlign="center">
              Whitelisting Required
            </Heading>
            <Text center secondary>
              Face verification is required before you can claim.
            </Text>
            <Button fullWidth onPress={actions.startVerification}>
              <ButtonText>Verify</ButtonText>
            </Button>
            <Text center flexDirection="row">
              We take your privacy seriously. We only store some particularities/relief data in our
              database, not the photo of your face itself.{' '}
            </Text>
            <Anchor href="https://www.facetec.com/#page-blk-security">Learn more</Anchor>
          </YStack>
        </ClaimCard>
      )}
      {/* ------------------------------------------------------------------ */}
      {/* Main claim card                                                      */}
      {/* ------------------------------------------------------------------ */}
      {status !== 'not_whitelisted' && (
        <ClaimCard>
          <YStack gap="$5" paddingVertical="$6">
            {/* Status content */}
            <YStack alignItems="center" gap="$4">
              {status === 'loading' && <Spinner size="lg" />}

              {status === 'not_connected' && (
                <>
                  <Text secondary>Connect your wallet to claim daily G$</Text>
                </>
              )}

              {(status === 'eligible' || status === 'claiming') && (
                <>
                  <Text secondary>Ready to claim</Text>
                  {displayAmount && <TokenAmount token="G$" amount={displayAmount} size="xl" />}
                </>
              )}

              {status === 'success' && (
                <Text color="$success" fontWeight="700">
                  Claimed successfully! 🎉
                </Text>
              )}

              {status === 'already_claimed' && (
                <>
                  <Text secondary>Just a little longer…</Text>
                  <Text secondary>More G$ coming soon</Text>
                </>
              )}

              {status === 'error' && error && (
                <Text color="$error" center>
                  {error}
                </Text>
              )}
            </YStack>

            {status !== 'loading' && claimablesByChain.length > 0 && (
              <ClaimChainBreakdown>
                <ClaimChainList>
                  {claimablesByChain.map((entry, index) => (
                    <ClaimChainItem key={entry.chainId}>
                      <TokenAmount token="G$" amount={entry.amount} size="sm" variant="secondary" />
                      <Text secondary>{getChainName(entry.chainId)}</Text>
                      {index < claimablesByChain.length - 1 && (
                        <Text variant="caption" secondary>
                          ·
                        </Text>
                      )}
                    </ClaimChainItem>
                  ))}
                </ClaimChainList>
              </ClaimChainBreakdown>
            )}

            {/* Action button — shown whenever there is a meaningful primary action */}
            {primaryAction !== 'none' && (
              <YStack alignItems="center" gap="$4">
                <ClaimActionButton onPress={handlePrimaryAction} disabled={isPending}>
                  {/* Blurred glow halo matching GoodWalletV2 claim button */}
                  <ClaimActionGlow style={{ filter: 'blur(20px)' } as React.CSSProperties} />
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
                    {isPending ? (
                      <XStack gap="$2" alignItems="center">
                        <ButtonText color="$grey600">{primaryLabel}</ButtonText>
                        <Spinner size="sm" color="$grey600" />
                      </XStack>
                    ) : (
                      <ButtonText color="$primary">{primaryLabel}</ButtonText>
                    )}
                  </YStack>
                </ClaimActionButton>
              </YStack>
            )}
          </YStack>
        </ClaimCard>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Next-claim footer (already_claimed state)                            */}
      {/* ------------------------------------------------------------------ */}
      {status === 'already_claimed' && nextClaimTime && (
        <ClaimCard>
          <YStack gap="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Text variant="label">Next claim in</Text>
              <Text fontWeight="600">
                <Countdown nextClaim={nextClaimTime} />
              </Text>
            </XStack>
            <Separator marginVertical="$1" />
            <Text variant="caption" center secondary>
              Your UBI resets each day. Come back when the timer ends.
            </Text>
          </YStack>
        </ClaimCard>
      )}

      <ClaimDailyStats>
        <Text variant="caption" secondary>
          Today
        </Text>
        <ClaimDailyStatsRow variant="caption" center secondary>
          <Text color="$colorSoft">{formatCompactNumber(dailyStats.dailyNumberOfClaimers)}</Text>{' '}
          claimers received
          <TokenAmount
            amount={dailyStats.dailyClaimedAmount}
            token="G$"
            size="sm"
            variant="secondary"
            useAbbreviations
          />
        </ClaimDailyStatsRow>
      </ClaimDailyStats>
      <ClaimInviteJoinCard />
    </YStack>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
type CitizenClaimTab = 'claim' | 'invite-rewards' | 'news-feed'
/**
 * CitizenClaimWidget — real SDK-backed GoodDollar UBI claim flow.
 *
 * Aligned to GoodWalletV2 claim behavior and the claim-widget-theme-demo visual baseline.
 *
 * Usage as a React component:
 *   <CitizenClaimWidget provider={eip1193Provider} />
 *
 * Also available as a Web Component via the `element` or `register` entry points.
 *
 * Provider-first runtime path:
 *   host provider → GoodWidgetProvider → citizen-claim adapter → citizen-sdk
 */
export function CitizenClaimWidget({
  provider,
  environment = 'production',
  chainId,
  themeOverrides,
  config,
  defaultTheme = 'dark',
  onClaimSuccess,
  onClaimError,
  inviteAdapterFactory,
}: CitizenClaimWidgetProps) {
  const [activeTab, setActiveTab] = useState<CitizenClaimTab>('claim')

  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <InviteRuntimeProvider environment={environment} adapterFactory={inviteAdapterFactory}>
        <WidgetTabs
          tabs={[
            { id: 'claim', label: 'Claim' },
            { id: 'invite-rewards', label: 'Invite Rewards' },
            { id: 'news-feed', label: 'News' },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId: string) => setActiveTab(tabId as CitizenClaimTab)}
          chainId={chainId ?? 42220}
        />
        {activeTab === 'claim' ? (
          <>
            <CitizenClaimInner
              environment={environment}
              // walletMode={walletMode}
              onClaimSuccess={onClaimSuccess}
              onClaimError={onClaimError}
            />
            <ToastContainer />
          </>
        ) : activeTab === 'invite-rewards' ? (
          <InviteRewards />
        ) : (
          <Card width="100%">
            <YStack alignItems="center" justifyContent="center" minHeight={320}>
              <Text variant="body">Widget coming soon</Text>
            </YStack>
          </Card>
        )}
      </InviteRuntimeProvider>
    </GoodWidgetProvider>
  )
}
