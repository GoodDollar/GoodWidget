import React, { useState } from 'react'
import { Button, ButtonText, Card, Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { AiCreditsStatusNotice } from '../theme/cards'
import { AntseedSignerRow } from '../setup/AntseedSignerRow'
import { monospaceSingleLineStyle, compactButtonProps } from '../shared/styles'
import { useCopyFeedback } from '../shared/useCopyFeedback'

interface GenerateSignerKeyPanelProps {
  signerPubKey: string | null
  signerPrvKey: string | null
  /** Doubles as the screen selector: false shows generate/save, true shows the Antseed guide. */
  signerPubKeySaved: boolean
  onGenerate: () => void | Promise<void>
  onConfirm: () => void
  /** Advances past the signer key step. */
  onProceed?: () => void
  proceedLabel?: string
  /** Opens the API setup route in the first stepper step. */
  onOpenApiSetup?: () => void
  embedded?: boolean
}

/** Numbered heading, so each screen reads as a short ordered list. */
function NumberedStep({ index, title }: { index: number; title: string }) {
  return (
    <XStack gap="$2" alignItems="center">
      <YStack
        width={24}
        height={24}
        borderRadius="$full"
        backgroundColor="$backgroundSurface"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Text fontSize="$1" fontWeight="700">
          {index}
        </Text>
      </YStack>
      <Text fontSize="$3" fontWeight="700">
        {title}
      </Text>
    </XStack>
  )
}

/**
 * Generating a signer key, split across two screens.
 *
 * One screen previously created the key and explained where to paste it into
 * Antseed — two unrelated jobs, and too much at once. Screen one now ends when
 * the key is saved; screen two covers where it goes. The import route is
 * deliberately untouched.
 */
export function GenerateSignerKeyPanel({
  signerPubKey,
  signerPrvKey,
  signerPubKeySaved,
  onGenerate,
  onConfirm,
  onProceed,
  proceedLabel = 'Continue to Authorize Credits Management',
  onOpenApiSetup,
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

  // ---- Screen 2: where the key goes -------------------------------------
  if (signerPubKeySaved) {
    return (
      <Shell gap="$3">
        <Heading level={5}>Add your Signer Key to Antseed</Heading>
        <Text fontSize="$2" tone="soft" lineHeight="$3">
          You&apos;ll need to do this to use your AI credits. If you haven&apos;t downloaded Antseed
          Desktop yet, you can do this later.
        </Text>

        <YStack gap="$2">
          <NumberedStep index={1} title="Open Antseed Desktop" />
          <NumberedStep index={2} title="Go to Profile → Signer" />
          <NumberedStep index={3} title="Tap ↑, paste your Signer Private Key, and save" />
        </YStack>

        <AntseedSignerRow mode="generate" showCaption={false} />

        <AiCreditsStatusNotice>
          <Text fontSize="$2" tone="soft" lineHeight="$3">
            The address you see when you paste your private key is the public address used for your
            AI credits.
          </Text>
        </AiCreditsStatusNotice>

        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2" lineHeight="$3">
            Back up any existing AntSeed signer key before importing this one. Importing replaces
            the signer used by your AntSeed account.
          </Text>
        </AiCreditsStatusNotice>

        {onOpenApiSetup && (
          <XStack gap="$2" alignItems="center">
            <Icon name="settings" size="xs" color="muted" />
            <Text fontSize="$2" tone="soft" flex={1} lineHeight="$3">
              Advanced user? Use{' '}
              <Text fontSize="$2" color="$primary" onPress={onOpenApiSetup} cursor="pointer">
                API Setup
              </Text>{' '}
              instead to use your AI credits through your terminal.
            </Text>
          </XStack>
        )}

        {onProceed && (
          <Button size="sm" {...compactButtonProps} onPress={onProceed}>
            <ButtonText>{proceedLabel}</ButtonText>
          </Button>
        )}
      </Shell>
    )
  }

  // ---- Screen 1: make the key, save the key ------------------------------
  return (
    <Shell gap="$3">
      <Heading level={5}>Signer Key</Heading>
      <Text>
        Sign a message with your wallet to generate your Antseed Signer Key. Save the private key —
        you&apos;ll need it to use your AI credits.
      </Text>

      <NumberedStep index={1} title="Generate your Signer Key" />
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
          <NumberedStep index={2} title="Save your Signer Key" />
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
            <Button
              size="sm"
              variant="ghost"
              iconSize="sm"
              onPress={() => void copyAddress(signerPubKey)}
            >
              <Icon
                name={copiedAddress ? 'check' : 'copy'}
                size="xs"
                color={copiedAddress ? 'success' : 'text'}
              />
            </Button>
          </XStack>

          {signerPrvKey && (
            <>
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
              <AiCreditsStatusNotice borderColor="$warning">
                <Text color="$warning" fontSize="$2" lineHeight="$3">
                  Revealing your private key can expose your account. Never share it — store it in a
                  secure place.
                </Text>
              </AiCreditsStatusNotice>

              <Button size="sm" {...compactButtonProps} onPress={onConfirm}>
                <ButtonText>I&apos;ve Saved My Private Key</ButtonText>
              </Button>
            </>
          )}
        </YStack>
      )}
    </Shell>
  )
}
