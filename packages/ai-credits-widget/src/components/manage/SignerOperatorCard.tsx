import React, { useEffect, useState } from 'react'
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
  Drawer,
  ScrollArea,
} from '@goodwidget/ui'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
import { SignerKeyPanel } from '../setup/SignerKeyPanel'
import { RevokeConsentStep } from './RevokeConsentStep'
import { monospaceSingleLineStyle, compactButtonProps, truncateAddress } from '../shared/styles'
import { useCopyFeedback } from '../shared/useCopyFeedback'

interface SignerOperatorCardProps {
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
      backgroundColor="$backgroundSurface"
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

function SignerStatus({ consented, size = '$1' }: { consented: boolean; size?: '$1' | '$2' }) {
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

function SignerSelector({
  signers,
  activeSignerAddress,
  onSelect,
}: {
  signers: string[]
  activeSignerAddress: string | null
  onSelect: (address: string) => void
}) {
  return (
    <YStack gap="$1">
      {signers.map((signer) => {
        const isActive = signer.toLowerCase() === activeSignerAddress?.toLowerCase()
        return (
          <XStack
            key={signer}
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
            backgroundColor={isActive ? '$infoMuted' : '$background'}
            cursor={isActive ? 'default' : 'pointer'}
            hoverStyle={isActive ? {} : { backgroundColor: '$backgroundPress' }}
            onPress={() => {
              if (!isActive) void onSelect(signer)
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
              {shortAddress(signer)}
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
export function SignerOperatorCard({ state, actions }: SignerOperatorCardProps) {
  const {
    signerPubKey,
    signerPrvKey,
    operatorSignature,
    operatorConsented,
    operatorConsentPending,
    signers,
  } = state

  const [isExpanded, setIsExpanded] = useState(false)
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [showReplacePanel, setShowReplacePanel] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  // Remounts SignerKeyPanel so it returns to its Generate / Import choice after a
  // signer settles, instead of staying parked in the sub-flow that created it.
  const [panelInstance, setPanelInstance] = useState(0)
  const [showRevokeDrawer, setShowRevokeDrawer] = useState(false)
  // Keeps a pre-existing widget error out of the sheet until this flow produces one.
  const [revokeAttempted, setRevokeAttempted] = useState(false)

  const signerCanSign = Boolean(signerPrvKey || operatorSignature)
  // Revoking is signed locally by the signer key, so a deep-link signer that only carries
  // an operator signature cannot revoke even though it can consent.
  const signerCanRevoke = Boolean(signerPrvKey)

  // revokeOperatorConsent reports failure through state.error rather than by rejecting,
  // so the sheet closes on consent actually dropping — not on the promise settling.
  useEffect(() => {
    if (!operatorConsented) setShowRevokeDrawer(false)
  }, [operatorConsented])

  const handleConfirmRevoke = () => {
    setRevokeAttempted(true)
    void Promise.resolve(actions.revokeOperatorConsent())
  }

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
          {signerPubKey ? (
            <XStack alignItems="center" flexWrap="wrap">
              {/* Separators carry their own spacing: adjacent Text renders inline, so
                  the flex gap between two of them collapses. */}
              <Text fontSize="$1" tone="soft" style={monospaceSingleLineStyle}>
                {`${truncateAddress(signerPubKey)}  ·  `}
              </Text>
              <SignerStatus consented={operatorConsented} />
            </XStack>
          ) : (
            <Text fontSize="$1" tone="soft">
              No signer key yet
            </Text>
          )}
        </YStack>
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size="sm" color="muted" />
      </XStack>

      {isExpanded && (
        <YStack gap="$4">
          {signerPubKey && (
            <YStack gap="$2">
              <Text variant="label" tone="soft">
                Active Signer Key
              </Text>
              <YStack
                backgroundColor="$background"
                borderRadius="$2"
                borderWidth={1}
                borderColor="$borderColor"
                padding="$2"
                gap="$2"
              >
                <CopyableValue value={signerPubKey} display={truncateAddress(signerPubKey)} />
                <SignerStatus consented={operatorConsented} size="$2" />
                {!operatorConsented && (
                  <Button
                    size="sm"
                    {...compactButtonProps}
                    disabled={operatorConsentPending || !signerCanSign}
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
                {operatorConsented && signerCanRevoke && (
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="$error"
                    {...compactButtonProps}
                    disabled={operatorConsentPending}
                    onPress={() => {
                      setRevokeAttempted(false)
                      setShowRevokeDrawer(true)
                    }}
                  >
                    {operatorConsentPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <ButtonText color="$error">Unauthorize Wallet</ButtonText>
                    )}
                  </Button>
                )}
              </YStack>
            </YStack>
          )}

          {signers.length > 1 && (
            <YStack gap="$2">
              <DisclosureToggle
                open={showSwitcher}
                label={`Switch signer (${signers.length})`}
                onPress={() => setShowSwitcher((prev) => !prev)}
              />
              {showSwitcher && (
                <SignerSelector
                  signers={signers}
                  activeSignerAddress={signerPubKey}
                  onSelect={actions.selectSigner}
                />
              )}
            </YStack>
          )}

          <YStack gap="$2">
            {signerPubKey ? (
              <DisclosureToggle
                open={showReplacePanel}
                label="New Signer Key"
                onPress={() => setShowReplacePanel((prev) => !prev)}
              />
            ) : null}
            {(showReplacePanel || !signerPubKey) && (
              <SignerKeyPanel
                key={panelInstance}
                state={state}
                actions={actions}
                showHeading={false}
                compact={Boolean(signerPubKey)}
                proceedLabel="Done"
                onProceed={() => setPanelInstance((prev) => prev + 1)}
              />
            )}
          </YStack>

          {signerPrvKey && (
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center" gap="$2">
                <Text variant="label" tone="soft">
                  Signer Private Key
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
                value={signerPrvKey}
                display={
                  showPrivateKey ? signerPrvKey : '•'.repeat(Math.min(48, signerPrvKey.length))
                }
              />
              <Text fontSize="$1" color="$warning">
                Treat this like a password — anyone who has it can spend your credits.
              </Text>
            </YStack>
          )}
        </YStack>
      )}

      <Drawer open={showRevokeDrawer} onClose={() => setShowRevokeDrawer(false)}>
        <ScrollArea width="100%">
          <YStack gap="$3" paddingBottom="$4" width="100%">
            <RevokeConsentStep
              signerPubKey={signerPubKey}
              operatorConsentPending={operatorConsentPending}
              error={revokeAttempted ? (state.error ?? null) : null}
              onConfirm={handleConfirmRevoke}
              onCancel={() => setShowRevokeDrawer(false)}
            />
          </YStack>
        </ScrollArea>
      </Drawer>
    </Card>
  )
}
