import React, { useState } from 'react'
import { Anchor, Button, Card, Icon, Text, XStack, YStack, copyTextToClipboard } from '@goodwidget/ui'

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
    <Card gap="$2">
      <XStack justifyContent="space-between" alignItems="center">
        <XStack
          flex={1}
          justifyContent="space-between"
          alignItems="center"
          onPress={() => setExpanded((value) => !value)}
          cursor="pointer"
        >
          <Text fontSize="$3" fontWeight="600">
            API Setup
          </Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-right'} size="xs" color="muted" />
        </XStack>
        <Button size="sm" variant="ghost" iconSize="sm" onPress={handleCopy}>
          <Icon name={copied ? 'check' : 'copy'} size="xs" color={copied ? 'success' : 'text'} />
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
    </Card>
  )
}

