import React, { useState } from 'react'
import {
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Card,
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
import { AiCreditsStatusNotice } from '../theme/cards'
import { compactButtonProps } from '../shared/styles'

interface SignerKeyPanelProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
}

const ZERO_OPERATOR = '0x0000000000000000000000000000000000000000'

/**
 * Setup-tab signer onboarding. The existing BuyerKeyPanel owns the wallet-derived
 * generation display; this component adds the explicit generate/import choice.
 */
export function SignerKeyPanel({ state, actions }: SignerKeyPanelProps) {
  const [choice, setChoice] = useState<'generate' | 'import' | null>(null)
  const [privateKey, setPrivateKey] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [keyConfirmed, setKeyConfirmed] = useState(false)

  const currentOperator = state.currentOperator?.toLowerCase()
  const hasDifferentOperator =
    Boolean(state.currentOperator) &&
    currentOperator !== ZERO_OPERATOR &&
    currentOperator !== state.operatorAddress?.toLowerCase()

  if (hasDifferentOperator && choice === 'import') {
    return (
      <Card gap="$3">
        <Heading level={5}>Signer Key</Heading>
        <AiCreditsStatusNotice>
          <Text color="$error" fontWeight="700">
            Signer key cannot be used
          </Text>
          <Text secondary>
            This signer already has another operator configured. Choose Generate or Import to
            continue with a different signer key.
          </Text>
        </AiCreditsStatusNotice>
        <Button size="sm" {...compactButtonProps} onPress={() => setChoice(null)}>
          <ButtonText>Back to Generate / Import</ButtonText>
        </Button>
      </Card>
    )
  }

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
    return (
      <Card gap="$3">
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
          secureTextEntry
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
        {state.buyerPrvKey && state.buyerPubKey && (
          <YStack gap="$2">
            <Text color="$success" fontWeight="700">
              Signer imported
            </Text>
            <Text secondary>
              {state.operatorConsented
                ? 'GoodDollar is already configured as the operator.'
                : currentOperator === ZERO_OPERATOR || !currentOperator
                  ? 'No operator is configured yet. Continue to authorize GoodDollar.'
                  : 'The configured operator is being checked.'}
            </Text>
          </YStack>
        )}
      </Card>
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
