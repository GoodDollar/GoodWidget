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
} from '@goodwidget/ui'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
import { BuyerKeyPanel } from '../buy/BuyerKeyPanel'
import { compactButtonProps } from '../shared/styles'

interface SignerKeyPanelProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
}

const ZERO_OPERATOR = '0x0000000000000000000000000000000000000000'

export function SignerKeyPanel({ state, actions }: SignerKeyPanelProps) {
  const [choice, setChoice] = useState<'generate' | 'import' | null>(null)
  const [privateKey, setPrivateKey] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [keyConfirmed, setKeyConfirmed] = useState(false)

  const currentOperator = state.currentOperator?.toLowerCase()
  const expectedOperator = state.operatorAddress?.toLowerCase()
  // Only meaningful once the operator status of the active signer has loaded:
  // an unknown expected operator must never read as "a different operator".
  const hasDifferentOperator =
    Boolean(currentOperator) &&
    currentOperator !== ZERO_OPERATOR &&
    Boolean(expectedOperator) &&
    currentOperator !== expectedOperator

  if (choice === 'generate') {
    return (
      <YStack gap="$3">
        <Button variant="ghost" alignSelf="flex-start" onPress={() => setChoice(null)}>
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
      </YStack>
    )
  }

  if (choice === 'import') {
    // The operator check belongs to the signer that was just imported, so it is
    // only evaluated once the import settled and its operator status refreshed.
    const importedSigner = Boolean(state.buyerPrvKey && state.buyerPubKey) && !isImporting
    const importedSignerBlocked = importedSigner && hasDifferentOperator

    return (
      <YStack gap="$3">
        <Button variant="ghost" alignSelf="flex-start" onPress={() => setChoice(null)}>
          <ButtonText>Back to Generate / Import</ButtonText>
        </Button>
        <Heading level={5}>Import Signer Key</Heading>
        <Text secondary>
          Paste the private key from AntSeed. It will be checked against the operator configured
          for this signer before you can continue.
        </Text>
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
            void actions.importBuyerFromPrivateKey(privateKey.trim()).finally(() => {
              setIsImporting(false)
            })
          }}
        >
          <ButtonText>{isImporting ? 'Checking signer…' : 'Import Signer Key'}</ButtonText>
        </Button>
        {importedSignerBlocked ? (
          <YStack gap="$2">
            <Text color="$error" fontWeight="700">
              Signer key cannot be used
            </Text>
            <Text secondary>
              The imported signer key already has another operator configured. Paste a different
              signer key, or go back and generate a new one.
            </Text>
          </YStack>
        ) : importedSigner ? (
          <YStack gap="$2">
            <Text color="$success" fontWeight="700">
              Signer imported
            </Text>
            <Text secondary>
              {state.operatorConsented
                ? 'GoodDollar is already configured as the operator.'
                : currentOperator === ZERO_OPERATOR
                  ? 'No operator is configured yet. Continue to authorize GoodDollar.'
                  : 'The configured operator is being checked.'}
            </Text>
          </YStack>
        ) : null}
      </YStack>
    )
  }

  return (
    <YStack gap="$3">
      <Heading level={5}>Signer Key</Heading>
      <Text secondary>
        A dedicated identity used only to buy and spend AI credits — separate from your wallet.
      </Text>
      <XStack gap="$3">
        <Button
          flex={1}
          size="lg"
          variant="outline"
          {...compactButtonProps}
          onPress={() => setChoice('generate')}
        >
          <Badge type="success">
            <BadgeText>Recommended</BadgeText>
          </Badge>
          <ButtonText>Generate Signer Key</ButtonText>
        </Button>
        <Button
          flex={1}
          size="lg"
          variant="outline"
          {...compactButtonProps}
          onPress={() => setChoice('import')}
        >
          <ButtonText>Import Signer Key</ButtonText>
        </Button>
      </XStack>
      <Text fontSize="$2" secondary>
        Generate is recommended for a fresh signer. Either direction uses the same key once it is
        set up in AntSeed.
      </Text>
    </YStack>
  )
}
