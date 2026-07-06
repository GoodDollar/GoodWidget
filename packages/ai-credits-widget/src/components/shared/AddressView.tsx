import { Button, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { monospaceSingleLineStyle, truncateAddress } from './styles'
import { useCopyFeedback } from './useCopyFeedback'

export function AddressView({ label, address }: { label: string; address: string }) {
  const { copied, copy } = useCopyFeedback()

  return (
    <YStack gap="$1">
      <Text fontSize="$1" secondary>
        {label}
      </Text>
      <XStack
        backgroundColor="$backgroundMuted"
        borderRadius="$2"
        padding="$2"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text
          fontSize="$2"
          fontFamily="$mono"
          flex={1}
          numberOfLines={1}
          style={monospaceSingleLineStyle}
        >
          {truncateAddress(address)}
        </Text>
        <Button size="sm" variant="ghost" iconSize="sm" onPress={() => void copy(address)}>
          <Icon name={copied ? 'check' : 'copy'} size="xs" color={copied ? 'success' : 'text'} />
        </Button>
      </XStack>
    </YStack>
  )
}

