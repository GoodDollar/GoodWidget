import { Button, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { CopyAnnouncement } from './CopyAnnouncement'
import { monospaceSingleLineStyle } from './styles'
import { useCopyFeedback } from './useCopyFeedback'

interface CopyableValueRowProps {
  label: string
  /** Value shown on screen; may be shortened. */
  displayValue: string
  /** Value placed on the clipboard; defaults to the displayed value. */
  copyValue?: string
  /** Accessible name of the icon-only copy button. */
  copyButtonLabel: string
}

/** Labelled, single-line monospace value with a copy button. */
export function CopyableValueRow({
  label,
  displayValue,
  copyValue = displayValue,
  copyButtonLabel,
}: CopyableValueRowProps) {
  const { copied, copy } = useCopyFeedback()

  return (
    <YStack gap="$1">
      <Text fontSize="$1" tone="soft">
        {label}
      </Text>
      <XStack
        backgroundColor="$backgroundSurface"
        borderRadius="$2"
        padding="$2"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text fontSize="$2" flex={1} numberOfLines={1} style={monospaceSingleLineStyle}>
          {displayValue}
        </Text>
        <Button
          size="sm"
          variant="ghost"
          iconSize="sm"
          aria-label={copyButtonLabel}
          onPress={() => void copy(copyValue)}
        >
          <Icon name={copied ? 'check' : 'copy'} size="xs" color={copied ? 'success' : 'text'} />
        </Button>
        <CopyAnnouncement copied={copied} />
      </XStack>
    </YStack>
  )
}
