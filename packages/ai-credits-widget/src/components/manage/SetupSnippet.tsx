import React, { useState } from 'react'
import { Anchor, Button, ButtonText, Heading, Icon, Text, XStack, YStack, copyTextToClipboard } from '@goodwidget/ui'
import { SetupSnippetCard } from '../theme/cards'

const ANTSEED_API_DOCS_URL = 'https://antseed.com/docs/guides/using-the-api'

const setupSnippetLineStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 13,
  lineHeight: '20px',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
}

interface SetupSnippetProps {
  snippet: string
}

export function SetupSnippet({ snippet }: SetupSnippetProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyText = snippet.replace(/\n\n+/g, '\n').trim()
  const lines = snippet.trim().split('\n')

  async function handleCopy() {
    const copied = await copyTextToClipboard(copyText)
    if (!copied) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <SetupSnippetCard>
      <XStack justifyContent="space-between" alignItems="center">
        <XStack
          flex={1}
          justifyContent="space-between"
          alignItems="center"
          onPress={() => setExpanded((value) => !value)}
          cursor="pointer"
        >
          <Heading level={5}>API Setup</Heading>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="sm" />
        </XStack>
        <Button size="sm" variant="ghost" onPress={handleCopy}>
          <ButtonText>{copied ? 'Copied!' : 'Copy'}</ButtonText>
        </Button>
      </XStack>

      {expanded && (
        <YStack gap="$2">
          <YStack backgroundColor="$backgroundMuted" borderRadius="$2" padding="$3" width="100%" gap="$1">
            {lines.map((line, index) => (
              <Text key={index} color="$text" style={setupSnippetLineStyle}>
                {line.length > 0 ? line : ' '}
              </Text>
            ))}
          </YStack>
          <Text fontSize="$1" secondary>
            Setup guide:{' '}
            <Anchor href={ANTSEED_API_DOCS_URL} target="_blank">
              antseed.com/docs
            </Anchor>
          </Text>
        </YStack>
      )}
    </SetupSnippetCard>
  )
}

