import React, { useState } from 'react'
import { Button, ButtonText, Card, Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { AiCreditsStatusNotice } from '../theme/cards'
import { AntseedSignerRow } from '../setup/AntseedSignerRow'
import { monospaceSingleLineStyle, compactButtonProps } from '../shared/styles'
import { useCopyFeedback } from '../shared/useCopyFeedback'

interface GenerateSignerKeyPanelProps {
  signerPubKey: string | null
  signerPrvKey: string | null
  signerPubKeySaved: boolean
  onGenerate: () => void | Promise<void>
  onConfirm: () => void
  embedded?: boolean
}

export function GenerateSignerKeyPanel({
  signerPubKey,
  signerPrvKey,
  signerPubKeySaved,
  onGenerate,
  onConfirm,
  embedded = false,
}: GenerateSignerKeyPanelProps) {
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

  const Shell = embedded ? YStack : Card

  return (
    <Shell gap="$3">
      <Heading level={5}>Signer Key</Heading>
      <Text>
        Sign a message with your wallet to generate your Antseed Signer Key. Save the private key — you’ll need it to use your AI credits.
      </Text>

      <YStack gap="$3">
        <Button
          size="sm"
          {...compactButtonProps}
          onPress={handleGenerate}
          disabled={isGenerating || Boolean(signerPrvKey)}
        >
          <ButtonText>{isGenerating ? 'Waiting for signature…' : 'Sign & Generate Key'}</ButtonText>
        </Button>

        {signerPubKey && (
          <YStack gap="$2">
            <Text variant="label" tone="soft">
              Signer Address
            </Text>
            <XStack
              backgroundColor="$backgroundSurface"
              borderRadius="$2"
              padding="$3"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="$2" style={monospaceSingleLineStyle} flex={1} numberOfLines={1}>
                {signerPubKey}
              </Text>
              <Button size="sm" variant="ghost" iconSize="sm" onPress={() => void copyAddress(signerPubKey)}>
                <Icon
                  name={copiedAddress ? 'check' : 'copy'}
                  size="xs"
                  color={copiedAddress ? 'success' : 'text'}
                />
              </Button>
            </XStack>

            {signerPrvKey && (
              <>
                <AiCreditsStatusNotice borderColor="$warning">
                  <Text color="$warning" fontSize="$2">
                    Back up any existing AntSeed signer key before importing this one. Importing
                    replaces the signer used by your AntSeed account.
                  </Text>
                </AiCreditsStatusNotice>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text variant="label" tone="soft">
                    Signer Private Key — save this securely
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
                  backgroundColor="$backgroundSurface"
                  borderRadius="$2"
                  padding="$3"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Text fontSize="$2" style={monospaceSingleLineStyle} flex={1} numberOfLines={1}>
                    {isPrivateKeyVisible
                      ? signerPrvKey
                      : '•'.repeat(Math.min(48, signerPrvKey.length))}
                  </Text>
                  <Button
                    size="sm"
                    variant="ghost"
                    iconSize="sm"
                    onPress={() => void copyPrivate(signerPrvKey)}
                  >
                    <Icon
                      name={copiedPrivate ? 'check' : 'copy'}
                      size="xs"
                      color={copiedPrivate ? 'success' : 'text'}
                    />
                  </Button>
                </XStack>
                <AntseedSignerRow mode="generate" />
                <Text fontSize="$2" tone="soft">
                  The public address above is the signer identity used for AI credits.
                </Text>
              </>
            )}

            {signerPrvKey && !signerPubKeySaved && (
              <Button size="sm" {...compactButtonProps} onPress={onConfirm}>
                <ButtonText>I've Saved My Private Key</ButtonText>
              </Button>
            )}

            {signerPubKeySaved && (
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
