import React, { useState } from 'react'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Icon,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
import { SignerKeyPanel } from '../setup/SignerKeyPanel'
import { monospaceSingleLineStyle, compactButtonProps, truncateAddress } from '../shared/styles'
import { useCopyFeedback } from '../shared/useCopyFeedback'

interface BuyerOperatorCardProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** Chevron + label row used for the switch-signer and private-key disclosures. */
function DisclosureToggle({
  open,
  label,
  onPress,
}: {
  open: boolean
  label: string
  onPress: () => void
}) {
  return (
    <Button
      variant="text"
      size="sm"
      alignSelf="flex-start"
      gap="$1.5"
      {...compactButtonProps}
      paddingHorizontal="$0"
      aria-expanded={open}
      onPress={onPress}
    >
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size="xs" color="primary" />
      <ButtonText>{label}</ButtonText>
    </Button>
  )
}

/** Monospace value with a copy affordance — used for the signer and its private key. */
function CopyableValue({ value, display }: { value: string; display?: string }) {
  const { copied, copy } = useCopyFeedback()

  return (
    <XStack
      backgroundColor="$backgroundMuted"
      borderRadius="$2"
      padding="$2"
      justifyContent="space-between"
      alignItems="center"
      gap="$2"
    >
      <Text fontSize="$2" flex={1} numberOfLines={1} style={monospaceSingleLineStyle}>
        {display ?? value}
      </Text>
      <Button size="sm" variant="ghost" iconSize="sm" onPress={() => void copy(value)}>
        <Icon name={copied ? 'check' : 'copy'} size="xs" color={copied ? 'success' : 'text'} />
      </Button>
    </XStack>
  )
}

function SignerStatus({
  consented,
  size = '$1',
}: {
  consented: boolean
  size?: '$1' | '$2'
}) {
  return (
    <XStack gap="$1" alignItems="center">
      <Icon
        name={consented ? 'check' : 'alert-triangle'}
        size="2xs"
        color={consented ? 'success' : 'warning'}
      />
      <Text fontSize={size} color={consented ? '$success' : '$warning'}>
        {consented ? 'Authorized' : 'Not authorized'}
      </Text>
    </XStack>
  )
}

function BuyerSelector({
  buyers,
  activeBuyerAddress,
  onSelect,
}: {
  buyers: string[]
  activeBuyerAddress: string | null
  onSelect: (address: string) => void
}) {
  return (
    <YStack gap="$1">
      {buyers.map((buyer) => {
        const isActive = buyer.toLowerCase() === activeBuyerAddress?.toLowerCase()
        return (
          <XStack
            key={buyer}
            tag="button"
            role="option"
            aria-selected={isActive}
            alignItems="center"
            justifyContent="space-between"
            gap="$2"
            paddingHorizontal="$2"
            paddingVertical="$1.5"
            borderRadius="$2"
            borderWidth={1}
            borderColor={isActive ? '$primary' : '$borderColor'}
            backgroundColor={isActive ? '$infoMuted' : '$backgroundDark'}
            cursor={isActive ? 'default' : 'pointer'}
            hoverStyle={isActive ? {} : { backgroundColor: '$backgroundPress' }}
            onPress={() => {
              if (!isActive) void onSelect(buyer)
            }}
          >
            <Text
              fontSize="$2"
              fontWeight={isActive ? '700' : '500'}
              color={isActive ? '$primary' : '$color'}
              numberOfLines={1}
              flex={1}
              style={monospaceSingleLineStyle}
            >
              {shortAddress(buyer)}
            </Text>
            {isActive ? (
              <XStack gap="$1" alignItems="center">
                <Text fontSize="$1" color="$primary">
                  active
                </Text>
                <Icon name="check" size="xs" color="primary" />
              </XStack>
            ) : null}
          </XStack>
        )
      })}
    </YStack>
  )
}

/**
 * Signer Key card for the Manage tab.
 *
 * Collapsed by default: the header carries the active signer and its authorization state,
 * which is all this card needs to report at rest. Everything else — switching signers,
 * generating or importing a key, and the private key itself — sits behind a disclosure so
 * Manage stays focused on credits. Generate/Import reuse the Set up tab's SignerKeyPanel
 * so there is a single implementation of that flow.
 */
export function BuyerOperatorCard({ state, actions }: BuyerOperatorCardProps) {
  const {
    buyerPubKey,
    buyerPrvKey,
    operatorSignature,
    operatorConsented,
    operatorConsentPending,
    buyers,
  } = state

  const [isExpanded, setIsExpanded] = useState(false)
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [showReplacePanel, setShowReplacePanel] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  // Remounts SignerKeyPanel so it returns to its Generate / Import choice after a
  // signer settles, instead of staying parked in the sub-flow that created it.
  const [panelInstance, setPanelInstance] = useState(0)

  const buyerCanSign = Boolean(buyerPrvKey || operatorSignature)

  return (
    <Card gap="$3" data-testid="signer-key-card">
      <XStack
        tag="button"
        data-testid="signer-key-toggle"
        alignItems="center"
        justifyContent="space-between"
        gap="$2"
        width="100%"
        backgroundColor="transparent"
        borderWidth={0}
        paddingHorizontal="$0"
        paddingVertical="$0"
        cursor="pointer"
        aria-expanded={isExpanded}
        onPress={() => setIsExpanded((prev) => !prev)}
      >
        <YStack gap="$1" flex={1} minWidth={0} alignItems="flex-start">
          <Heading level={6}>Signer Key</Heading>
          {buyerPubKey ? (
            <XStack alignItems="center" flexWrap="wrap">
              {/* Separators carry their own spacing: adjacent Text renders inline, so
                  the flex gap between two of them collapses. */}
              <Text fontSize="$1" secondary style={monospaceSingleLineStyle}>
                {`${truncateAddress(buyerPubKey)}  ·  `}
              </Text>
              <SignerStatus consented={operatorConsented} />
            </XStack>
          ) : (
            <Text fontSize="$1" secondary>
              No signer key yet
            </Text>
          )}
        </YStack>
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size="sm" color="muted" />
      </XStack>

      {isExpanded && (
        <YStack gap="$4">
          {buyerPubKey && (
            <YStack gap="$2">
              <Text variant="label" secondary>
                Active signer
              </Text>
              <YStack
                backgroundColor="$backgroundDark"
                borderRadius="$2"
                borderWidth={1}
                borderColor="$borderColor"
                padding="$2"
                gap="$2"
              >
                <CopyableValue value={buyerPubKey} display={truncateAddress(buyerPubKey)} />
                <SignerStatus consented={operatorConsented} size="$2" />
                {!operatorConsented && (
                  <Button
                    size="sm"
                    {...compactButtonProps}
                    disabled={operatorConsentPending || !buyerCanSign}
                    onPress={() => {
                      void Promise.resolve(actions.signOperatorConsent())
                    }}
                  >
                    {operatorConsentPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <ButtonText>Authorize GoodDollar</ButtonText>
                    )}
                  </Button>
                )}
              </YStack>
            </YStack>
          )}

          {buyers.length > 1 && (
            <YStack gap="$2">
              <DisclosureToggle
                open={showSwitcher}
                label={`Switch signer (${buyers.length})`}
                onPress={() => setShowSwitcher((prev) => !prev)}
              />
              {showSwitcher && (
                <BuyerSelector
                  buyers={buyers}
                  activeBuyerAddress={buyerPubKey}
                  onSelect={actions.selectBuyer}
                />
              )}
            </YStack>
          )}

          <YStack gap="$2">
            {buyerPubKey ? (
              <DisclosureToggle
                open={showReplacePanel}
                label="Replace signer key"
                onPress={() => setShowReplacePanel((prev) => !prev)}
              />
            ) : null}
            {(showReplacePanel || !buyerPubKey) && (
              <SignerKeyPanel
                key={panelInstance}
                state={state}
                actions={actions}
                showHeading={false}
                compact={Boolean(buyerPubKey)}
                proceedLabel="Done"
                onProceed={() => setPanelInstance((prev) => prev + 1)}
              />
            )}
          </YStack>

          {buyerPrvKey && (
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center" gap="$2">
                <Text variant="label" secondary>
                  Private key
                </Text>
                <Button
                  variant="text"
                  size="sm"
                  {...compactButtonProps}
                  paddingHorizontal="$0"
                  onPress={() => setShowPrivateKey((prev) => !prev)}
                >
                  <ButtonText>{showPrivateKey ? 'Hide' : 'Reveal'}</ButtonText>
                </Button>
              </XStack>
              <CopyableValue
                value={buyerPrvKey}
                display={
                  showPrivateKey ? buyerPrvKey : '•'.repeat(Math.min(48, buyerPrvKey.length))
                }
              />
              <Text fontSize="$1" color="$warning">
                Treat this like a password — anyone who has it can spend your credits.
              </Text>
            </YStack>
          )}
        </YStack>
      )}
    </Card>
  )
}
