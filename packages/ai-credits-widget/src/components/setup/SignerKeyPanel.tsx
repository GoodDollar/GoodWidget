import React, { useState } from 'react'
import {
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Heading,
  Input,
  Text,
  XStack,
  YStack,
  Icon,
} from '@goodwidget/ui'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
import { BuyerKeyPanel } from '../buy/BuyerKeyPanel'
import { AntseedSignerRow } from './AntseedSignerRow'
import { compactButtonProps, truncateAddress } from '../shared/styles'

interface SignerKeyPanelProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
  /** Called once a signer is generated-and-confirmed or imported successfully. */
  onProceed: () => void
  /** Hide the panel heading when the host section already carries one (Manage tab). */
  showHeading?: boolean
  /** Overrides the label of the button offered once a signer is settled. */
  proceedLabel?: string
  /**
   * Narrow presentation for the Manage tab: stacked full-width choices, no badge and
   * no surrounding prose, so replacing a signer reads as a secondary action.
   */
  compact?: boolean
}

const ZERO_OPERATOR = '0x0000000000000000000000000000000000000000'

export function SignerKeyPanel({
  state,
  actions,
  onProceed,
  showHeading = true,
  proceedLabel: proceedLabelOverride,
  compact = false,
}: SignerKeyPanelProps) {
  const [choice, setChoice] = useState<'generate' | 'import' | null>(null)
  const [privateKey, setPrivateKey] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [keyConfirmed, setKeyConfirmed] = useState(false)
  // Address returned by an import performed in this panel — the status block
  // reports on that import only, never on a signer that was already active.
  const [importedAddress, setImportedAddress] = useState<string | null>(null)

  const leaveChoice = () => {
    setChoice(null)
    setImportedAddress(null)
  }

  const currentOperator = state.currentOperator?.toLowerCase()
  const expectedOperator = state.operatorAddress?.toLowerCase()
  // Only meaningful once the operator status of the active signer has loaded:
  // an unknown expected operator must never read as "a different operator".
  // Once the signer is settled the only step left is authorizing the wallet —
  // unless this signer already carries GoodDollar consent, which ends setup.
  const proceedLabel =
    proceedLabelOverride ?? (state.operatorConsented ? 'Done' : 'Continue to Authorize Wallet')

  const hasDifferentOperator =
    Boolean(currentOperator) &&
    currentOperator !== ZERO_OPERATOR &&
    Boolean(expectedOperator) &&
    currentOperator !== expectedOperator

  if (choice === 'generate') {
    return (
      <YStack gap="$3">
        <Button variant="text" alignSelf="flex-start" onPress={leaveChoice}>
          <Icon name="arrow-left" size="xs" color="primary" />
          <ButtonText>Back to Generate / Import</ButtonText>
        </Button>
        <BuyerKeyPanel
          embedded
          buyerPubKey={state.buyerPubKey}
          buyerPrvKey={state.buyerPrvKey}
          buyerPubKeySaved={keyConfirmed}
          onGenerate={actions.generateBuyerKey}
          onConfirm={() => setKeyConfirmed(true)}
        />
        {keyConfirmed && (
          <Button size="sm" {...compactButtonProps} onPress={onProceed}>
            <ButtonText>{proceedLabel}</ButtonText>
          </Button>
        )}
      </YStack>
    )
  }

  if (choice === 'import') {
    // The operator check belongs to the signer that was just imported, so it is
    // only evaluated once the import settled and its operator status refreshed.
    const importedSigner =
      !isImporting &&
      Boolean(importedAddress) &&
      state.buyerPubKey?.toLowerCase() === importedAddress?.toLowerCase()
    const importedSignerBlocked = importedSigner && hasDifferentOperator

    return (
      <YStack gap="$3">
        <Button variant="text" alignSelf="flex-start" onPress={leaveChoice}>
          <Icon name="arrow-left" size="xs" color="primary" />
          <ButtonText>Back to Generate / Import</ButtonText>
        </Button>
        <Heading level={5}>Import Signer Key</Heading>
        <Text>
          Already have a signer key in Antseed? Export it there and paste it below. It will be
          checked against the operator configured for this signer before you can continue.
        </Text>
        <AntseedSignerRow mode="import" />
        <Input
          size="sm"
          value={privateKey}
          onChangeText={setPrivateKey}
          placeholder="0x…"
          autoCapitalize="none"
        />
        {state.error && <Text color="$error">{state.error}</Text>}
        <Button
          size="sm"
          {...compactButtonProps}
          disabled={!privateKey.trim() || isImporting}
          onPress={() => {
            setIsImporting(true)
            setImportedAddress(null)
            void actions
              .importBuyerFromPrivateKey(privateKey.trim())
              .then((buyerAddress) => setImportedAddress(buyerAddress))
              .catch(() => setImportedAddress(null))
              .finally(() => setIsImporting(false))
          }}
        >
          <ButtonText>{isImporting ? 'Checking signer…' : 'Import Signer Key'}</ButtonText>
        </Button>
        {importedSignerBlocked ? (
          <YStack gap="$2">
            <Text color="$error" fontWeight="700">
              Signer key cannot be used
            </Text>
            <Text tone="soft">
              The imported signer key already has another operator configured. Paste a different
              signer key, or go back and generate a new one.
            </Text>
          </YStack>
        ) : importedSigner ? (
          <YStack gap="$2">
            <Text color="$success" fontWeight="700">
              Signer imported
            </Text>
            <Text tone="soft">
              {truncateAddress(state.buyerPubKey ?? '')} is now your active signer.
            </Text>
            <Text tone="soft">
              {state.operatorConsented
                ? 'GoodDollar is already configured as the operator.'
                : currentOperator === ZERO_OPERATOR
                  ? 'No operator is configured yet. Continue to authorize GoodDollar.'
                  : 'The configured operator is being checked.'}
            </Text>
            <Button size="sm" {...compactButtonProps} onPress={onProceed}>
              <ButtonText>{proceedLabel}</ButtonText>
            </Button>
          </YStack>
        ) : null}
      </YStack>
    )
  }

  const choices = (
    <>
      <Button
        flex={compact ? undefined : 1}
        alignSelf={compact ? 'stretch' : undefined}
        size={compact ? 'sm' : 'lg'}
        {...compactButtonProps}
        onPress={() => setChoice('generate')}
      >
        {!compact && (
          <Badge type="success">
            <BadgeText>Recommended</BadgeText>
          </Badge>
        )}
        <ButtonText>Generate Signer Key</ButtonText>
      </Button>
      <Button
        flex={compact ? undefined : 1}
        alignSelf={compact ? 'stretch' : undefined}
        size={compact ? 'sm' : 'lg'}
        variant="outline"
        {...compactButtonProps}
        onPress={() => setChoice('import')}
      >
        <ButtonText>Import Signer Key</ButtonText>
      </Button>
    </>
  )

  return (
    <YStack gap="$3">
      {showHeading && <Heading level={5}>Signer Key</Heading>}
      {!compact && (
        <Text tone="soft">
          A dedicated identity used only to buy and spend AI credits — separate from your wallet.
        </Text>
      )}
      {compact ? <YStack gap="$2">{choices}</YStack> : <XStack gap="$3">{choices}</XStack>}
      {!compact && (
        <Text fontSize="$2" tone="soft">
          Generate is recommended for a fresh signer. Either direction uses the same key once it is
          set up in AntSeed.
        </Text>
      )}
    </YStack>
  )
}
