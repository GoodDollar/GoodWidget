import React, { useState } from 'react'
import { Button, ButtonText, Card, Heading, Icon, Input, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsWidgetAdapterActions, AiCreditsWidgetAdapterState } from '../../widgetRuntimeContract'
import { AddressView } from '../shared/AddressView'
import { monospaceSingleLineStyle, compactButtonProps } from '../shared/styles'
import { useCopyFeedback } from '../shared/useCopyFeedback'

interface BuyerOperatorCardProps {
  state: Pick<
    AiCreditsWidgetAdapterState,
    | 'address'
    | 'buyerPubKey'
    | 'buyerPrvKey'
    | 'operatorSignature'
    | 'operatorConsented'
    | 'operatorConsentPending'
    | 'buyers'
  >
  actions: Pick<
    AiCreditsWidgetAdapterActions,
    | 'generateBuyerKey'
    | 'selectBuyer'
    | 'importBuyerFromPrivateKey'
    | 'signOperatorConsent'
  >
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
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
  if (buyers.length <= 1) return null

  return (
    <YStack gap="$1">
      <Text fontSize="$1" secondary fontWeight="600">
        Buyers
      </Text>
      <YStack gap="$1">
        {buyers.map((buyer) => {
          const isActive = buyer.toLowerCase() === activeBuyerAddress?.toLowerCase()
          return (
            <XStack
              key={buyer}
              tag="button"
              role="option"
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
              {isActive && <Icon name="check" size="xs" color="primary" />}
            </XStack>
          )
        })}
      </YStack>
    </YStack>
  )
}

function BuyerImportPanel({
  onImportPrivateKey,
  onClose,
}: {
  onImportPrivateKey: (key: string) => Promise<void>
  onClose: () => void
}) {
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!inputValue.trim()) return
    setIsSubmitting(true)
    try {
      await onImportPrivateKey(inputValue.trim())
      setInputValue('')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <YStack gap="$2">
      <Text fontSize="$1" secondary fontWeight="600">
        Paste private key (0x…)
      </Text>
      <Input
        size="sm"
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="0x…"
        autoFocus
      />
      <XStack gap="$1">
        <Button
          size="sm"
          {...compactButtonProps}
          disabled={!inputValue.trim() || isSubmitting}
          onPress={() => {
            void handleSubmit()
          }}
        >
          <ButtonText>{isSubmitting ? 'Importing…' : 'Confirm'}</ButtonText>
        </Button>
        <Button
          size="sm"
          variant="outline"
          {...compactButtonProps}
          disabled={isSubmitting}
          onPress={onClose}
        >
          <ButtonText>Cancel</ButtonText>
        </Button>
      </XStack>
    </YStack>
  )
}

export function BuyerOperatorCard({ state, actions }: BuyerOperatorCardProps) {
  const {
    address,
    buyerPubKey,
    buyerPrvKey,
    operatorSignature,
    operatorConsented,
    operatorConsentPending,
    buyers,
  } = state
  const { copied: copiedPrivate, copy: copyPrivate } = useCopyFeedback()
  const [isPrivateKeyVisible, setIsPrivateKeyVisible] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const buyerCanSign = Boolean(buyerPrvKey || operatorSignature)

  return (
    <Card gap="$2">
      <Heading level={6}>Buyer &amp; Operator</Heading>

      {address && <AddressView label="Payer" address={address} />}
      {buyerPubKey && <AddressView label="Buyer" address={buyerPubKey} />}

      <BuyerSelector
        buyers={buyers}
        activeBuyerAddress={buyerPubKey}
        onSelect={actions.selectBuyer}
      />

      <XStack gap="$2" alignItems="stretch" width="100%">
        <Button
          flex={1}
          flexBasis={0}
          minWidth={0}
          size="sm"
          {...compactButtonProps}
          onPress={() => {
            setIsGenerating(true)
            void Promise.resolve(actions.generateBuyerKey()).finally(() => setIsGenerating(false))
          }}
          disabled={isGenerating || operatorConsentPending}
        >
          <ButtonText>{isGenerating ? 'Signing…' : 'Sign & Generate'}</ButtonText>
        </Button>

        <Button
          flex={1}
          flexBasis={0}
          minWidth={0}
          size="sm"
          {...compactButtonProps}
          onPress={() => {
            void Promise.resolve(actions.signOperatorConsent())
          }}
          disabled={operatorConsented || operatorConsentPending || !buyerCanSign}
        >
          {operatorConsentPending ? (
            <Spinner size="sm" />
          ) : (
            <ButtonText>{operatorConsented ? 'Consented' : 'Sign Consent'}</ButtonText>
          )}
        </Button>
      </XStack>

      {showImport ? (
        <BuyerImportPanel
          onImportPrivateKey={actions.importBuyerFromPrivateKey}
          onClose={() => setShowImport(false)}
        />
      ) : (
        <Button
          size="sm"
          variant="text"
          alignSelf="flex-start"
          {...compactButtonProps}
          onPress={() => setShowImport(true)}
        >
          <ButtonText>Import a buyer key…</ButtonText>
        </Button>
      )}

      {buyerPrvKey && (
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$1" secondary>
              Buyer Private Key
            </Text>
            <Button
              variant="text"
              size="sm"
              onPress={() => setIsPrivateKeyVisible((prev) => !prev)}
            >
              <ButtonText>{isPrivateKeyVisible ? 'Hide' : 'Reveal'}</ButtonText>
            </Button>
          </XStack>
          <XStack
            backgroundColor="$backgroundMuted"
            borderRadius="$2"
            padding="$2"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize="$2" style={monospaceSingleLineStyle} flex={1} numberOfLines={1}>
              {isPrivateKeyVisible
                ? buyerPrvKey
                : '•'.repeat(Math.min(48, buyerPrvKey.length))}
            </Text>
            <Button
              size="sm"
              variant="ghost"
              iconSize="sm"
              onPress={() => void copyPrivate(buyerPrvKey)}
            >
              <Icon
                name={copiedPrivate ? 'check' : 'copy'}
                size="xs"
                color={copiedPrivate ? 'success' : 'text'}
              />
            </Button>
          </XStack>
        </YStack>
      )}
    </Card>
  )
}
