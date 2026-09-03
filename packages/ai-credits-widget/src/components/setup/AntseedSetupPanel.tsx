import React, { useState } from 'react'
import {
  Anchor,
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

/** Placeholder, not the real key: the signer key may not exist at this step. */
const SETUP_SNIPPET = [
  'npm install -g @antseed/cli',
  '',
  'export ANTSEED_IDENTITY_HEX=<signer-private-key-hex>',
  '',
  'antseed signer start',
  'antseed network browse',
  'antseed signer connection set --peer <peer-id>',
].join('\n')

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
  /** Opens with the API section already expanded, for arrivals from the signer key guide. */
  expandApiSetup?: boolean
}

/**
 * First setup step: getting Antseed.
 *
 * One screen. The desktop download is the primary path and the API route is a
 * secondary disclosure on the same screen rather than a separate view — this
 * step covers getting Antseed and nothing else, so signer key guidance lives in
 * the signer key step where it belongs.
 */
export function AntseedSetupPanel({ onProceed, expandApiSetup = false }: AntseedSetupPanelProps) {
  const [apiExpanded, setApiExpanded] = useState(expandApiSetup)
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

  return (
    <YStack gap="$3">
      <Heading level={5}>Get Antseed</Heading>
      <Text fontSize="$2" tone="soft" lineHeight="$3">
        Download the free Antseed Desktop app to use your AI credits.
      </Text>

      <Button size="sm" {...compactButtonProps} onPress={handleDownload}>
        <ButtonText>Download Antseed</ButtonText>
        <Icon name="external-link" size="xs" color="inherit" />
      </Button>

      {/* Secondary route, collapsed by default: the desktop app is the primary
          experience and this only concerns advanced users. */}
      <YStack gap="$2">
        <XStack
          alignItems="center"
          gap="$2"
          cursor="pointer"
          aria-expanded={apiExpanded}
          onPress={() => setApiExpanded((open) => !open)}
        >
          <Text fontSize="$2" tone="soft" flex={1} lineHeight="$3">
            Advanced user? Use API Setup to use your AI credits through your terminal.
          </Text>
          <Text fontSize="$2" color="$primary">
            API Setup
          </Text>
          <Icon name={apiExpanded ? 'chevron-up' : 'chevron-down'} size="xs" color="muted" />
        </XStack>

        {apiExpanded && (
          <YStack gap="$2">
            <XStack justifyContent="flex-end">
              <Button size="sm" variant="ghost" iconSize="sm" onPress={() => void handleCopy()}>
                <Icon
                  name={copied ? 'check' : 'copy'}
                  size="xs"
                  color={copied ? 'success' : 'text'}
                />
              </Button>
            </XStack>
            <YStack backgroundColor="$backgroundSurface" borderRadius="$2" padding="$3" gap="$1">
              {SETUP_SNIPPET.split('\n').map((line, index) => (
                <Text key={index} style={snippetLineStyle}>
                  {line.length > 0 ? line : ' '}
                </Text>
              ))}
            </YStack>
            <Text fontSize="$1" tone="soft" lineHeight="$3">
              Your signer key goes in{' '}
              <Text fontSize="$1" fontWeight="700">
                ANTSEED_IDENTITY_HEX
              </Text>{' '}
              — generate or import it in the next step, then copy it from there. See the{' '}
              <Anchor href={ANTSEED_API_DOCS_URL} target="_blank">
                AntSeed API guide
              </Anchor>
              .
            </Text>
          </YStack>
        )}
      </YStack>

      <Button size="sm" {...compactButtonProps} onPress={onProceed}>
        <ButtonText>Continue to Signer Key</ButtonText>
        <Icon name="arrow-right" size="xs" color="inherit" />
      </Button>
    </YStack>
  )
}
