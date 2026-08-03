import React, { useState } from 'react'
import { Button, ButtonText, Card, Heading, Icon, Input, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsWidgetAdapterActions, AiCreditsWidgetAdapterState } from '../../widgetRuntimeContract'
import type { BuyerRecord } from '../../payerSession'
import { AddressView } from '../shared/AddressView'
import { monospaceSingleLineStyle, compactButtonProps } from '../shared/styles'
import { useCopyFeedback } from '../shared/useCopyFeedback'

interface BuyerOperatorCardProps {
  state: Pick<
    AiCreditsWidgetAdapterState,
    'address' | 'buyerPubKey' | 'buyerPrvKey' | 'operatorConsented' | 'buyers' | 'activeBuyerAddress'
  >
  actions: Pick<
    AiCreditsWidgetAdapterActions,
    | 'generateBuyerKey'
    | 'selectBuyer'
    | 'importBuyerFromPrivateKey'
    | 'selectBuyerByAddress'
    | 'signOperatorConsent'
  >
}

function buyerDisplayLabel(buyer: BuyerRecord): string {
  if (buyer.label) return buyer.label
  const shortAddr = `${buyer.address.slice(0, 6)}…${buyer.address.slice(-4)}`
  if (buyer.type === 'address-only') return `Watch ${shortAddr}`
  if (buyer.type === 'imported') return `Import ${shortAddr}`
  return 'Wallet buyer'
}

function BuyerSelector({
  buyers,
  activeBuyerAddress,
  onSelect,
}: {
  buyers: BuyerRecord[]
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
          const isActive = buyer.address.toLowerCase() === activeBuyerAddress?.toLowerCase()
          return (
            <XStack
              key={buyer.address}
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
                if (!isActive) onSelect(buyer.address)
              }}
            >
              <YStack flex={1} minWidth={0}>
                <Text
                  fontSize="$2"
                  fontWeight={isActive ? '700' : '500'}
                  color={isActive ? '$primary' : '$color'}
                  numberOfLines={1}
                >
                  {buyerDisplayLabel(buyer)}
                </Text>
                <Text fontSize="$1" secondary numberOfLines={1} style={monospaceSingleLineStyle}>
                  {buyer.address.slice(0, 10)}…{buyer.address.slice(-6)}
                </Text>
              </YStack>
              {buyer.type === 'address-only' && (
                <Text fontSize="$1" color="$warning" fontWeight="600">
                  view only
                </Text>
              )}
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
  onSelectAddress,
}: {
  onImportPrivateKey: (key: string) => Promise<void>
  onSelectAddress: (address: string) => void
}) {
  const [mode, setMode] = useState<'none' | 'private-key' | 'address'>('none')
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleCancel() {
    setMode('none')
    setInputValue('')
  }

  async function handleSubmit() {
    if (!inputValue.trim()) return
    setIsSubmitting(true)
    try {
      if (mode === 'private-key') {
        await onImportPrivateKey(inputValue.trim())
      } else {
        onSelectAddress(inputValue.trim())
      }
      setInputValue('')
      setMode('none')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (mode === 'none') {
    return (
      <XStack gap="$1" flexWrap="wrap">
        <Button
          size="sm"
          variant="outline"
          {...compactButtonProps}
          onPress={() => setMode('private-key')}
        >
          <ButtonText>Import Key</ButtonText>
        </Button>
        <Button
          size="sm"
          variant="outline"
          {...compactButtonProps}
          onPress={() => setMode('address')}
        >
          <ButtonText>Watch Address</ButtonText>
        </Button>
      </XStack>
    )
  }

  return (
    <YStack gap="$2">
      <Text fontSize="$1" secondary fontWeight="600">
        {mode === 'private-key' ? 'Paste private key (0x…)' : 'Paste buyer address (0x…)'}
      </Text>
      <Input
        size="sm"
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="0x…"
        secureTextEntry={mode === 'private-key'}
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
          onPress={handleCancel}
        >
          <ButtonText>Cancel</ButtonText>
        </Button>
      </XStack>
    </YStack>
  )
}

export function BuyerOperatorCard({ state, actions }: BuyerOperatorCardProps) {
  const { address, buyerPubKey, buyerPrvKey, operatorConsented, buyers, activeBuyerAddress } = state
  const { copied: copiedPrivate, copy: copyPrivate } = useCopyFeedback()
  const [isPrivateKeyVisible, setIsPrivateKeyVisible] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const activeBuyer = buyers.find(
    (buyer) =>
      buyer.address.toLowerCase() === (activeBuyerAddress ?? buyerPubKey ?? '').toLowerCase(),
  )
  const buyerCanSign = Boolean(buyerPrvKey || activeBuyer?.operatorSignature)
  const hasDerivedBuyer = buyers.some((buyer) => buyer.type === 'derived')

  return (
    <Card gap="$2">
      <Heading level={6}>Buyer &amp; Operator</Heading>

      {address && <AddressView label="Payer" address={address} />}
      {buyerPubKey && <AddressView label="Buyer" address={buyerPubKey} />}

      <BuyerSelector
        buyers={buyers}
        activeBuyerAddress={activeBuyerAddress}
        onSelect={actions.selectBuyer}
      />

      <XStack gap="$2" alignItems="stretch" width="100%">
        {!hasDerivedBuyer && (
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
            disabled={isGenerating}
          >
            <ButtonText>{isGenerating ? 'Signing…' : 'Sign & Generate'}</ButtonText>
          </Button>
        )}

        <Button
          flex={1}
          flexBasis={0}
          minWidth={0}
          size="sm"
          {...compactButtonProps}
          onPress={() => {
            setIsSigning(true)
            void Promise.resolve(actions.signOperatorConsent()).finally(() => setIsSigning(false))
          }}
          disabled={operatorConsented || isSigning || !buyerCanSign}
        >
          {isSigning ? (
            <Spinner size="sm" />
          ) : (
            <ButtonText>{operatorConsented ? 'Consented' : 'Sign Consent'}</ButtonText>
          )}
        </Button>
      </XStack>

      {showImport ? (
        <BuyerImportPanel
          onImportPrivateKey={actions.importBuyerFromPrivateKey}
          onSelectAddress={actions.selectBuyerByAddress}
        />
      ) : (
        <Button
          size="sm"
          variant="text"
          alignSelf="flex-start"
          {...compactButtonProps}
          onPress={() => setShowImport(true)}
        >
          <ButtonText>Import or watch a buyer…</ButtonText>
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
