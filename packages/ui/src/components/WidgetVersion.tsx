import { YStack } from 'tamagui'
import { Text } from './Text'

export interface WidgetVersionProps {
  /** Widget package version, taken from the widget's own package.json. */
  version: string
  /** Optional test id override. */
  testId?: string
}

/**
 * Small, muted version label rendered at the bottom-right corner of a widget.
 * It sits in normal flow below the widget content (right-aligned) so it never
 * overlaps or shifts the widget layout.
 */
export function WidgetVersion({ version, testId = 'widget-version' }: WidgetVersionProps) {
  return (
    <YStack width="100%" alignItems="flex-end" paddingHorizontal="$2" paddingBottom="$1">
      <Text variant="caption" tone="dim" opacity={0.7} data-testid={testId}>
        {`v${version}`}
      </Text>
    </YStack>
  )
}
