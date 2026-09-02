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
   * Marks the step done. Fires when either route is actually taken — opening
   * the download or copying the snippet — so someone who only ever uses the
   * CLI still sees the step complete.
   */
  onRouteTaken: () => void
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
 * Two routes, because the desktop app and the CLI are alternatives rather than
 * sequential steps. Mirrors SignerKeyPanel's generate/import choice so both
 * steps in this stepper open the same shape of drawer.
 */
export function AntseedSetupPanel({ onRouteTaken }: AntseedSetupPanelProps) {
  const [choice, setChoice] = useState<SetupChoice | null>(null)
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    if (typeof window !== 'undefined') {
      window.open(ANTSEED_DOWNLOAD_URL, '_blank', 'noopener,noreferrer')
    }
    onRouteTaken()
  }

  const handleCopy = async () => {
    const didCopy = await copyTextToClipboard(SETUP_SNIPPET.replace(/\n\n+/g, '\n').trim())
    if (!didCopy) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onRouteTaken()
  }

  if (choice === 'desktop') {
    return (
      <YStack gap="$3">
        <BackToChoices onPress={() => setChoice(null)} />
        <Heading level={5}>Desktop app</Heading>
        <Text fontSize="$2" tone="soft" lineHeight="$3">
          The free app that runs your credits locally. Install it, then come back for your signer
          key.
        </Text>
        <Button size="sm" {...compactButtonProps} onPress={handleDownload}>
          <ButtonText>Download Antseed</ButtonText>
          <Icon name="external-link" size="xs" color="inherit" />
        </Button>
        <Text fontSize="$1" tone="soft">
          Opens antseed.com in a new tab.
        </Text>
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
          Run credits from your own tooling instead of the desktop app.
        </Text>
        <YStack backgroundColor="$backgroundSurface" borderRadius="$2" padding="$3" gap="$1">
          {SETUP_SNIPPET.split('\n').map((line, index) => (
            <Text key={index} style={snippetLineStyle}>
              {line.length > 0 ? line : ' '}
            </Text>
          ))}
        </YStack>
        <Text fontSize="$1" tone="soft" lineHeight="$3">
          Your signer key goes in <Text fontSize="$1" fontWeight="700">ANTSEED_IDENTITY_HEX</Text> —
          generate or import it in the next step, then copy it from there. See the{' '}
          <Anchor href={ANTSEED_API_DOCS_URL} target="_blank">
            AntSeed API guide
          </Anchor>
          .
        </Text>
      </YStack>
    )
  }

  return (
    <YStack gap="$3">
      <Heading level={5}>Set up Antseed</Heading>
      <Text fontSize="$2" tone="soft" lineHeight="$3">
        Antseed runs your credits. Use the desktop app, or wire it into your own tooling.
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
          <ButtonText>Desktop app</ButtonText>
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
    </YStack>
  )
}
