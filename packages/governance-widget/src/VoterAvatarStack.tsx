import { Image } from 'react-native'
import { Stack } from 'tamagui'
import { Badge, BadgeText, Text, XStack } from '@goodwidget/ui'
import type { VoterPreview } from './types'

function VoterAvatar({ voter, index }: { voter: VoterPreview; index: number }) {
  const initial = voter.label.trim().slice(0, 1).toUpperCase() || '?'

  return (
    <Stack
      width={32}
      height={32}
      marginLeft={index === 0 ? 0 : -8}
      borderRadius="$full"
      borderWidth={2}
      borderColor="$background"
      backgroundColor="$backgroundHover"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      shadowColor="$elevationShadowColor"
      shadowOffset={{ width: 0, height: 4 }}
      shadowRadius={12}
    >
      {voter.avatarUrl ? (
        <Image
          source={{ uri: voter.avatarUrl }}
          accessibilityLabel={voter.label}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Text variant="caption" bold>
          {initial}
        </Text>
      )}
    </Stack>
  )
}

export function VoterAvatarStack({ voters, remainingLabel }: { voters: VoterPreview[]; remainingLabel?: string }) {
  return (
    <XStack alignItems="center" gap="$2">
      <XStack alignItems="center">
        {voters.slice(0, 4).map((voter, index) => (
          <VoterAvatar key={voter.id} voter={voter} index={index} />
        ))}
      </XStack>
      {remainingLabel ? (
        <Badge backgroundColor="$backgroundHover" paddingHorizontal="$3" paddingVertical="$2">
          <BadgeText color="$text">{remainingLabel}</BadgeText>
        </Badge>
      ) : null}
    </XStack>
  )
}
