import React from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Text } from './Text'
import { XStack, YStack } from '../components-test/Stacks'
import { createComponent } from '../createComponent'

const TONE = {
  can: {
    icon: 'check' as const,
    iconColor: 'success' as const,
    badgeBackground: '$successMuted',
    rowBackground: '$successMuted',
  },
  cannot: {
    icon: 'x' as const,
    iconColor: 'error' as const,
    badgeBackground: '$errorMuted',
    rowBackground: '$errorMuted',
  },
}

const PermissionListFrame = createComponent(YStack, {
  name: 'PermissionList',
  width: '100%',
  borderRadius: '$3',
  borderWidth: 1,
  borderColor: '$borderColor',
  overflow: 'hidden',
})

export interface PermissionRowProps {
  /** `can` reads as a granted capability, `cannot` as a hard limit. */
  tone: keyof typeof TONE
  /** Leading word, rendered bold — typically "Can" or "Cannot". */
  lead: string
  /** The rest of the sentence, continuing from `lead`. */
  children: ReactNode
  /** Set on every row but the last, to divide them. */
  divided?: boolean
}

/**
 * One capability or limit in a permission disclosure.
 *
 * Built for the pattern where a user is asked to grant something and needs to
 * see, at a glance, both what it allows and what it does not. Reads as precise,
 * so only state limits that are actually enforced.
 *
 * Wrap a set of these in `PermissionList`.
 */
export function PermissionRow({ tone, lead, children, divided = false }: PermissionRowProps) {
  const style = TONE[tone]

  return (
    <XStack
      gap="$3"
      alignItems="flex-start"
      paddingHorizontal="$3"
      paddingVertical="$3"
      backgroundColor={style.rowBackground}
      borderBottomWidth={divided ? 1 : 0}
      borderColor="$borderColor"
    >
      <YStack
        width={22}
        height={22}
        borderRadius="$full"
        backgroundColor={style.badgeBackground}
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        marginTop={1}
      >
        <Icon name={style.icon} size="xs" color={style.iconColor} />
      </YStack>
      <Text fontSize="$2" lineHeight="$3" flex={1}>
        <Text fontSize="$2" fontWeight="700">
          {lead}
        </Text>{' '}
        {children}
      </Text>
    </XStack>
  )
}

/** Container for a set of `PermissionRow`s, drawing the shared border. */
export function PermissionList({ children }: { children: ReactNode }) {
  return <PermissionListFrame>{children}</PermissionListFrame>
}
