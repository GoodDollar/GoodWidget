import React, { useCallback, useEffect, useState } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  createComponent,
  Card,
  Heading,
  Text,
  ButtonFrame,
  ButtonText,
  TokenAmount,
  Badge,
  BadgeText,
  Spinner,
  Separator,
  XStack,
  YStack,
} from '@goodwidget/ui'
import { useCitizenClaimAdapter } from './adapter'
import type {
  CitizenClaimWidgetProps,
  CitizenClaimWidgetSuccessDetail,
  CitizenClaimWidgetErrorDetail,
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

// ---------------------------------------------------------------------------
// Countdown — shows HH:MM:SS until the next claimable period.
// ---------------------------------------------------------------------------
function Countdown({ nextClaim }: { nextClaim: Date }) {
  const getTimeLeft = () => Math.max(0, Math.floor((nextClaim.getTime() - Date.now()) / 1000))
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  environment?: string
  onClaimSuccess?: (detail: CitizenClaimWidgetSuccessDetail) => void
  onClaimError?: (detail: CitizenClaimWidgetErrorDetail) => void
}

function CitizenClaimInner({ environment, onClaimSuccess, onClaimError }: CitizenClaimInnerProps) {
  const { state, actions } = useCitizenClaimAdapter({ environment })
  const { status, address, chainId, amount, primaryAction, primaryLabel, error, nextClaimTime } =
    state

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
          const receipt = await actions.claim()
          onClaimSuccess?.({
            address: address!,
            chainId: chainId!,
            transactionHash: (receipt as { transactionHash?: string } | undefined)
              ?.transactionHash,
          })
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
  }, [primaryAction, actions, address, chainId, onClaimSuccess, onClaimError])

  const isPending = status === 'claiming' || status === 'loading'

  return (
    <YStack gap="$5" padding="$4">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$1">
        <Heading level={4}>GoodDollar</Heading>
        {chainId && (
          <Badge type="info">
            <BadgeText>Chain {chainId}</BadgeText>
          </Badge>
        )}
      </XStack>

      {/* ------------------------------------------------------------------ */}
      {/* Main claim card                                                      */}
      {/* ------------------------------------------------------------------ */}
      <ClaimCard>
        <YStack gap="$9" paddingVertical="$6">
          {/* Status content */}
          <YStack alignItems="center" gap="$4">
            {status === 'loading' && <Spinner size="lg" />}

            {status === 'not_connected' && (
              <>
                <Text secondary>Connect your wallet to claim G$</Text>
                {chainId !== null && !state.chainId && (
                  <Text center secondary>
                    Switch to a supported network (Fuse, Celo, or XDC)
                  </Text>
                )}
              </>
            )}

            {status === 'not_whitelisted' && (
              <>
                <Text secondary>Identity verification required</Text>
                <Text center secondary>
                  Verify your identity with GoodID to receive UBI.
                </Text>
              </>
            )}

            {(status === 'eligible' || status === 'claiming') && (
              <>
                <Text secondary>Ready to claim</Text>
                {amount && <TokenAmount token="G$" amount={amount} size="xl" />}
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

          {/* Action button — shown whenever there is a meaningful primary action */}
          {primaryAction !== 'none' && (
            <YStack alignItems="center" gap="$4">
              <ClaimActionButton onPress={handlePrimaryAction} disabled={isPending}>
                {/* Blurred glow halo matching GoodWalletV2 claim button */}
                <ClaimActionGlow
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore — web-only style prop not in RN types
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
                  {isPending ? (
                    <XStack gap="$2" alignItems="center">
                      <Spinner size="sm" color="$grey600" />
                      <ButtonText color="$grey600">{primaryLabel}</ButtonText>
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
    </YStack>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

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
  themeOverrides,
  config,
  defaultTheme = 'light',
  onClaimSuccess,
  onClaimError,
}: CitizenClaimWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <CitizenClaimInner
        environment={environment}
        onClaimSuccess={onClaimSuccess}
        onClaimError={onClaimError}
      />
    </GoodWidgetProvider>
  )
}
