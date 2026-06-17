import React from 'react'
import { Badge, BadgeText, Card, Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'

export type OnboardingNoticeBadgeType = 'info' | 'warning' | 'success'
export type OnboardingNoticeIconName = 'info' | 'check' | 'alert-triangle'

interface OnboardingNoticeProps {
  badgeLabel: string
  badgeType: OnboardingNoticeBadgeType
  title: string
  description: string
  iconName: OnboardingNoticeIconName
}

export function OnboardingNotice({
  badgeLabel,
  badgeType,
  title,
  description,
  iconName,
}: OnboardingNoticeProps) {
  return (
    <Card outlined>
      <XStack alignItems="flex-start" gap="$3">
        <YStack
          width={44}
          height={44}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          backgroundColor={
            badgeType === 'success'
              ? '$successMuted'
              : badgeType === 'warning'
                ? '$warningMuted'
                : '$infoMuted'
          }
        >
          <Icon
            name={iconName}
            color={badgeType === 'warning' ? 'error' : badgeType === 'success' ? 'success' : 'primary'}
          />
        </YStack>
        <YStack flex={1} gap="$2">
          <Badge type={badgeType}>
            <BadgeText>{badgeLabel}</BadgeText>
          </Badge>
          <YStack gap="$1">
            <Heading level={5}>{title}</Heading>
            <Text tone="secondary">{description}</Text>
          </YStack>
        </YStack>
      </XStack>
    </Card>
  )
}
