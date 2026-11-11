import React from 'react'
import type { ReactNode } from 'react'
import { Button, ButtonText, Card, Heading, Icon, Spinner, Text, YStack, type IconName } from '@goodwidget/ui'

export interface ScreenCardProps {
  icon?: IconName
  title?: string
  description?: string
  'data-testid'?: string
  children?: ReactNode
}

/** Shared card shell of every screen: optional icon, title and description, then the screen body. */
export function ScreenCard({ icon, title, description, 'data-testid': dataTestId, children }: ScreenCardProps) {
  return (
    <Card elevated padding="$5" gap="$4" data-testid={dataTestId}>
      {title && (
        <YStack alignItems="center" gap="$3">
          {icon && <Icon name={icon} size="lg" color="primary" round />}
          <Heading level={5} textAlign="center">
            {title}
          </Heading>
          {description && (
            <Text tone="secondary" center>
              {description}
            </Text>
          )}
        </YStack>
      )}
      {children}
    </Card>
  )
}

export interface ScreenActionProps {
  label: string
  onPress: () => void
  /** primary: solid; secondary: outlined; text: centered low-emphasis link style. */
  variant?: 'primary' | 'secondary' | 'text'
  'data-testid'?: string
}

/** Action button of a screen in one of the three emphasis levels used by the designs. */
export function ScreenAction({ label, onPress, variant = 'primary', 'data-testid': dataTestId }: ScreenActionProps) {
  if (variant === 'text') {
    return (
      <YStack alignItems="center">
        <Button variant="text" onPress={onPress} data-testid={dataTestId}>
          <ButtonText color="$primary">{label}</ButtonText>
        </Button>
      </YStack>
    )
  }
  return (
    <Button variant={variant} fullWidth onPress={onPress} data-testid={dataTestId}>
      <ButtonText>{label}</ButtonText>
    </Button>
  )
}

/** Body of an in-progress screen: spinner plus a status line. */
export function WaitingState({ message }: { message: string }) {
  return (
    <YStack alignItems="center" gap="$3" paddingVertical="$3">
      <Spinner size="lg" />
      <Text tone="secondary" center>
        {message}
      </Text>
    </YStack>
  )
}
