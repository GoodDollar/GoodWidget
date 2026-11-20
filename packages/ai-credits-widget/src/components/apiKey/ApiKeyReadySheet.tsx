import { useEffect, useRef, useState } from 'react'
import { Button, ButtonText, Drawer, Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { GATEWAY_BASE_URL_FORMATS } from '../../aiCreditsApi/gatewayUrlFormats'
import type { GatewayToolFamily } from '../../aiCreditsApi/gatewayUrlFormats'
import { AiCreditsStatusNotice } from '../theme/cards'
import { CopyAnnouncement } from '../shared/CopyAnnouncement'
import { compactButtonProps } from '../shared/styles'
import { useCopyFeedback } from '../shared/useCopyFeedback'

interface ApiKeyReadySheetProps {
  /** Full key to reveal; the sheet is open exactly while this is set. Held in memory by the caller only. */
  fullKey: string | null
  /** Gateway base URL from the backend, filled into the snippet. */
  baseUrl: string
  /** Called once the user has confirmed they saved the key; the caller must then drop the key. */
  onDismiss: () => void
}

const TOOL_FAMILY_LABELS: Record<GatewayToolFamily, string> = {
  claudeCode: 'Claude Code',
  openAiCompatible: 'Codex & others',
}

const TOOL_FAMILIES = Object.keys(TOOL_FAMILY_LABELS) as GatewayToolFamily[]

/** Builds the shell snippet the user pastes into their tool's environment. */
function buildEnvironmentSnippet(
  toolFamily: GatewayToolFamily,
  baseUrl: string,
  fullKey: string,
): string {
  const formattedBaseUrl = GATEWAY_BASE_URL_FORMATS[toolFamily](baseUrl)
  if (toolFamily === 'claudeCode') {
    return `export ANTHROPIC_BASE_URL="${formattedBaseUrl}"\nexport ANTHROPIC_API_KEY="${fullKey}"`
  }
  return `export OPENAI_BASE_URL="${formattedBaseUrl}"\nexport OPENAI_API_KEY="${fullKey}"`
}

/** Style for secret text that must wrap rather than overflow a 390px sheet. */
const wrappingMonospaceStyle = {
  fontFamily: 'monospace',
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
} as const

/**
 * Bottom sheet that shows the full API key once, with a ready-to-paste snippet.
 * Dismissing without "I've saved my key" asks for confirmation first, because the key cannot be shown again.
 */
export function ApiKeyReadySheet({ fullKey, baseUrl, onDismiss }: ApiKeyReadySheetProps) {
  const [toolFamily, setToolFamily] = useState<GatewayToolFamily>('claudeCode')
  const [isConfirmingDismiss, setIsConfirmingDismiss] = useState(false)
  const { copied: keyCopied, copy: copyKey } = useCopyFeedback()
  const { copied: snippetCopied, copy: copySnippet } = useCopyFeedback()
  const headingRef = useRef<HTMLElement | null>(null)

  // Each new reveal starts from the default view, not the previous one.
  useEffect(() => {
    if (fullKey === null) {
      setToolFamily('claudeCode')
      setIsConfirmingDismiss(false)
    }
  }, [fullKey])

  // Moves keyboard and screen-reader focus into the sheet whenever its view changes.
  useEffect(() => {
    if (fullKey !== null) headingRef.current?.focus()
  }, [fullKey, isConfirmingDismiss])

  const snippet = fullKey === null ? '' : buildEnvironmentSnippet(toolFamily, baseUrl, fullKey)

  return (
    <Drawer
      open={fullKey !== null}
      height="full"
      onClose={() => setIsConfirmingDismiss(true)}
    >
      {fullKey === null ? null : isConfirmingDismiss ? (
        <YStack gap="$4" width="100%">
          <Heading level={5} ref={headingRef} tabIndex={-1}>
            Close without saving?
          </Heading>
          <Text tone="soft" lineHeight="$3">
            This is the only time your full key is shown. If you lose it, you will need to rotate it
            to get a new one.
          </Text>
          <YStack gap="$2">
            <Button size="sm" {...compactButtonProps} onPress={() => setIsConfirmingDismiss(false)}>
              <ButtonText>Go back</ButtonText>
            </Button>
            <Button variant="outline" size="sm" {...compactButtonProps} onPress={onDismiss}>
              <ButtonText>Close anyway</ButtonText>
            </Button>
          </YStack>
        </YStack>
      ) : (
        <YStack gap="$3" width="100%">
          <Heading level={5} ref={headingRef} tabIndex={-1}>
            Your API key is ready
          </Heading>

          <YStack gap="$1">
            <Text fontSize="$1" tone="soft">
              API key
            </Text>
            <XStack
              backgroundColor="$backgroundSurface"
              borderRadius="$2"
              padding="$2"
              alignItems="center"
              gap="$2"
            >
              <Text fontSize="$2" flex={1} style={wrappingMonospaceStyle}>
                {fullKey}
              </Text>
              <Button
                size="sm"
                variant="ghost"
                iconSize="sm"
                aria-label="Copy API key"
                onPress={() => void copyKey(fullKey)}
              >
                <Icon
                  name={keyCopied ? 'check' : 'copy'}
                  size="xs"
                  color={keyCopied ? 'success' : 'text'}
                />
              </Button>
              <CopyAnnouncement copied={keyCopied} />
            </XStack>
          </YStack>

          <AiCreditsStatusNotice borderColor="$warning">
            <XStack gap="$2" alignItems="flex-start">
              <Icon name="alert-triangle" size="sm" color="warning" />
              <Text color="$warning" fontSize="$2" lineHeight="$3" flex={1}>
                Copy your key now — you won&apos;t be able to see it again. Anyone who has it can
                spend your credits, so keep it private.
              </Text>
            </XStack>
          </AiCreditsStatusNotice>

          <YStack gap="$2">
            <XStack gap="$2">
              {TOOL_FAMILIES.map((family) => (
                <Button
                  key={family}
                  flex={1}
                  size="sm"
                  variant={family === toolFamily ? 'primary' : 'outline'}
                  aria-pressed={family === toolFamily}
                  {...compactButtonProps}
                  onPress={() => setToolFamily(family)}
                >
                  <ButtonText numberOfLines={1}>{TOOL_FAMILY_LABELS[family]}</ButtonText>
                </Button>
              ))}
            </XStack>
            <YStack backgroundColor="$backgroundSurface" borderRadius="$2" padding="$2" gap="$2">
              <Text fontSize="$1" style={wrappingMonospaceStyle}>
                {snippet}
              </Text>
              <Button
                size="sm"
                variant="outline"
                alignSelf="flex-start"
                gap="$1"
                {...compactButtonProps}
                onPress={() => void copySnippet(snippet)}
              >
                <Icon
                  name={snippetCopied ? 'check' : 'copy'}
                  size="xs"
                  color={snippetCopied ? 'success' : 'text'}
                />
                <ButtonText>{snippetCopied ? 'Copied' : 'Copy snippet'}</ButtonText>
              </Button>
              <CopyAnnouncement copied={snippetCopied} />
            </YStack>
          </YStack>

          <Button size="sm" {...compactButtonProps} onPress={onDismiss}>
            <ButtonText>I&apos;ve saved my key</ButtonText>
          </Button>
        </YStack>
      )}
    </Drawer>
  )
}
