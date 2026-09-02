import React, { useState } from 'react'
import {
  Anchor,
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Heading,
  Icon,
  Text,
  XStack,
  YStack,
  copyTextToClipboard,
} from '@goodwidget/ui'
import { compactButtonProps } from '../shared/styles'

const ANTSEED_DOWNLOAD_URL = 'https://antseed.com'
const ANTSEED_API_DOCS_URL = 'https://antseed.com/docs/guides/using-the-api'

const snippetLineStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 13,
  lineHeight: '20px',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
}

/** Placeholder, not the real key: at this step the signer key may not exist yet. */
const SETUP_SNIPPET = [
  'npm install -g @antseed/cli',
  '',
  'export ANTSEED_IDENTITY_HEX=<signer-private-key-hex>',
  '',
  'antseed signer start',
  'antseed network browse',
  'antseed signer connection set --peer <peer-id>',
].join('\n')

type SetupChoice = 'desktop' | 'api'

interface AntseedSetupPanelProps {
  /**
   * Advances to the signer key step and marks this one done.
   *
   * Driven by an explicit press, never by opening the download or copying the
   * snippet: neither proves anything — we cannot see an install, and a copy is
   * not a setup — and completing a step behind the user's back is how the
   * stepper ends up claiming work nobody did.
   */
  onProceed: () => void
}

function BackToChoices({ onPress }: { onPress: () => void }) {
  return (
    <Button variant="text" alignSelf="flex-start" onPress={onPress}>
      <Icon name="arrow-left" size="xs" color="primary" />
      <ButtonText>Back to Desktop / API</ButtonText>
    </Button>
  )
}

/**
 * First setup step: how the user intends to run their credits.
 *
 * Two routes, because the Antseed Desktop App and the CLI are alternatives rather than
 * sequential steps. Mirrors SignerKeyPanel's generate/import choice so both
 * steps in this stepper open the same shape of drawer.
 */
export function AntseedSetupPanel({ onProceed }: AntseedSetupPanelProps) {
  const [choice, setChoice] = useState<SetupChoice | null>(null)
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    if (typeof window !== 'undefined') {
      window.open(ANTSEED_DOWNLOAD_URL, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCopy = async () => {
    const didCopy = await copyTextToClipboard(SETUP_SNIPPET.replace(/\n\n+/g, '\n').trim())
    if (!didCopy) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (choice === 'desktop') {
    return (
      <YStack gap="$3">
        <BackToChoices onPress={() => setChoice(null)} />
        <Heading level={5}>Antseed Desktop App</Heading>
        <Text fontSize="$2" tone="soft" lineHeight="$3">
          The free desktop app that runs your credits locally. Install it, then come back for your signer
          key.
        </Text>
        <Button size="sm" {...compactButtonProps} onPress={handleDownload}>
          <ButtonText>Download Antseed</ButtonText>
          <Icon name="external-link" size="xs" color="inherit" />
        </Button>
        <Text fontSize="$1" tone="soft">
          Opens antseed.com in a new tab.
        </Text>
        <Button size="sm" {...compactButtonProps} onPress={onProceed}>
          <ButtonText>Continue to Signer key</ButtonText>
        </Button>
      </YStack>
    )
  }

  if (choice === 'api') {
    return (
      <YStack gap="$3">
        <BackToChoices onPress={() => setChoice(null)} />
        <XStack justifyContent="space-between" alignItems="center">
          <Heading level={5}>API setup</Heading>
          <Button size="sm" variant="ghost" iconSize="sm" onPress={() => void handleCopy()}>
            <Icon name={copied ? 'check' : 'copy'} size="xs" color={copied ? 'success' : 'text'} />
          </Button>
        </XStack>
        <Text fontSize="$2" tone="soft" lineHeight="$3">
          Run credits from your own terminal instead of the Antseed Desktop App.
        </Text>
        <YStack backgroundColor="$backgroundSurface" borderRadius="$2" padding="$3" gap="$1">
          {SETUP_SNIPPET.split('\n').map((line, index) => (
            <Text key={index} style={snippetLineStyle}>
              {line.length > 0 ? line : ' '}
            </Text>
          ))}
        </YStack>
        <Text fontSize="$1" tone="soft" lineHeight="$3">
          <Anchor href={ANTSEED_API_DOCS_URL} target="_blank">
            AntSeed API guide
          </Anchor>
          .
        </Text>
        <Button size="sm" {...compactButtonProps} onPress={onProceed}>
          <ButtonText>Continue to Signer key</ButtonText>
        </Button>
      </YStack>
    )
  }

  return (
    <YStack gap="$3">
      <Heading level={5}>Set up Antseed</Heading>
      <Text fontSize="$2" tone="soft" lineHeight="$3">
        Antseed runs your credits. Use the Antseed Desktop App, or wire it into your own terminal.
      </Text>
      <XStack gap="$2" width="100%" alignItems="stretch">
        <Button
          flexGrow={1}
          flexBasis={0}
          size="lg"
          {...compactButtonProps}
          onPress={() => setChoice('desktop')}
        >
          <Badge type="success">
            <BadgeText>Recommended</BadgeText>
          </Badge>
          <ButtonText>Antseed Desktop App</ButtonText>
        </Button>
        <Button
          flexGrow={1}
          flexBasis={0}
          size="lg"
          variant="outline"
          {...compactButtonProps}
          onPress={() => setChoice('api')}
        >
          <ButtonText>API setup</ButtonText>
        </Button>
      </XStack>
      <Button size="sm" {...compactButtonProps} onPress={onProceed}>
        <ButtonText>Continue to Signer key</ButtonText>
      </Button>
    </YStack>
  )
}
