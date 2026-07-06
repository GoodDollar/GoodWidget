import React, { useState } from 'react'
import { Button, ButtonText, Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { AiCreditsStatusNotice, BuyerKeyPanelCard } from '../theme/cards'
import { monospaceSingleLineStyle } from '../shared/styles'
import { useCopyFeedback } from '../shared/useCopyFeedback'

interface BuyerKeyPanelProps {
  buyerKey: string | null
  buyerKeyPrivate: string | null
  buyerKeyConfirmed: boolean
  onGenerate: () => void | Promise<void>
  onConfirm: () => void
  embedded?: boolean
}

export function BuyerKeyPanel({
  buyerKey,
  buyerKeyPrivate,
  buyerKeyConfirmed,
  onGenerate,
  onConfirm,
  embedded = false,
}: BuyerKeyPanelProps) {
  const { copied: copiedAddress, copy: copyAddress } = useCopyFeedback()
  const { copied: copiedPrivate, copy: copyPrivate } = useCopyFeedback()
  const [isPrivateKeyVisible, setIsPrivateKeyVisible] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      await onGenerate()
    } finally {
      setIsGenerating(false)
    }
  }

  const Shell = embedded ? YStack : BuyerKeyPanelCard

  return (
    <Shell gap="$3">
      <Heading level={5}>Buyer Key</Heading>
      <Text>
        Sign a message with your payer wallet to derive a deterministic AntSeed buyer key. Save the
        private key — you will need it to authenticate from your developer tools.
      </Text>

      <YStack gap="$3">
        <Button onPress={handleGenerate} disabled={isGenerating}>
          <ButtonText>{isGenerating ? 'Waiting for signature…' : 'Sign & Generate Key'}</ButtonText>
        </Button>

        {buyerKey && (
            <YStack gap="$2">
              {/* Address row */}
              <Text variant="label" secondary>
                Address (registered on-chain)
              </Text>
              <XStack
                backgroundColor="$backgroundMuted"
                borderRadius="$2"
                padding="$3"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text
                  fontSize="$2"
                  style={monospaceSingleLineStyle}
                  flex={1}
                  numberOfLines={1}
                >
                  {buyerKey}
                </Text>
                <Button size="sm" variant="ghost" iconSize="sm" onPress={() => void copyAddress(buyerKey)}>
                  <Icon name={copiedAddress ? 'check' : 'copy'} size="xs" color={copiedAddress ? 'success' : 'text'} />
                </Button>
              </XStack>

              {/* Private key row — only shown for generated keys */}
              {buyerKeyPrivate && (
                <>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text variant="label" secondary>
                      Private Key — save this securely
                    </Text>
                    <Button
                      variant="text"
                      size="sm"
                      onPress={() => {
                        setIsPrivateKeyVisible((prev) => !prev)
                      }}
                    >
                      <ButtonText>{isPrivateKeyVisible ? 'Hide' : 'Reveal'}</ButtonText>
                    </Button>
                  </XStack>
                  <AiCreditsStatusNotice borderColor="$warning">
                    <Text color="$warning" fontSize="$2">
                      ⚠ Revealing your private key can expose your account. Never share it — store it in a
                      secure place.
                    </Text>
                  </AiCreditsStatusNotice>
                  <XStack
                    backgroundColor="$backgroundMuted"
                    borderRadius="$2"
                    padding="$3"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Text
                      fontSize="$2"
                      style={monospaceSingleLineStyle}
                      flex={1}
                      numberOfLines={1}
                    >
                      {isPrivateKeyVisible ? buyerKeyPrivate : '•'.repeat(Math.min(48, buyerKeyPrivate.length))}
                    </Text>
                    <Button size="sm" variant="ghost" iconSize="sm" onPress={() => void copyPrivate(buyerKeyPrivate)}>
                      <Icon name={copiedPrivate ? 'check' : 'copy'} size="xs" color={copiedPrivate ? 'success' : 'text'} />
                    </Button>
                  </XStack>
                </>
              )}

              {!buyerKeyConfirmed && (
                <Button onPress={onConfirm}>
                  <ButtonText>I've Saved My Private Key</ButtonText>
                </Button>
              )}

              {buyerKeyConfirmed && (
                <XStack gap="$2" alignItems="center">
                  <Icon name="check" size="sm" color="success" />
                  <Text color="$success" fontSize="$2">
                    Key confirmed — you can proceed
                  </Text>
                </XStack>
              )}
            </YStack>
          )}
      </YStack>
    </Shell>
  )
}

