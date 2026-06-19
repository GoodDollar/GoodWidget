import type { ReactNode } from 'react'
import { Stack, Theme, useThemeName } from 'tamagui'
import { ButtonFrame, Card, Heading, Icon, Text, XStack, YStack, createComponent } from '@goodwidget/ui'
import type { GovernanceAmount, VoteSegment } from './types'
import { clampPercentage, formatCompactValue, formatRawValue } from './format'

export const SEGMENT_TONES: Record<NonNullable<VoteSegment['tone']>, string> = {
  for: '$primary',
  against: '$error',
  abstain: '$placeholderColor',
  neutral: '$success',
}

export type GovernanceAmountSize = 'sm' | 'md' | 'lg' | 'xl'

type GovernanceThemeComponentName =
  | 'ImpactCard'
  | 'ImpactCardAction'
  | 'BalanceCard'
  | 'OptimisticVotingProposalCard'
  | 'AlignmentVotingProposalCard'
  | 'FundingDistributionChart'

/**
 * Activates a governance component sub-theme while preserving the provider's
 * light or dark mode. Named frames register the override target; this boundary
 * lets their composed children consume the same semantic values.
 */
export function GovernanceComponentTheme({
  componentName,
  children,
}: {
  componentName: GovernanceThemeComponentName
  children: ReactNode
}) {
  const parentThemeName = useThemeName({ parent: true })
  const mode = parentThemeName.startsWith('dark') ? 'dark' : 'light'

  return <Theme name={`${mode}_${componentName}` as typeof parentThemeName}>{children}</Theme>
}

const GOVERNANCE_CARD_LAYOUT = {
  extends: 'Card',
  width: '100%',
  gap: '$4',
  elevated: true,
} as const

export const ImpactCardFrame = createComponent(Card, {
  name: 'ImpactCard',
  ...GOVERNANCE_CARD_LAYOUT,
  maxWidth: 390,
  overflow: 'hidden',
  borderWidth: 0,
  padding: '$5',
})

export const ImpactCardAction = createComponent(ButtonFrame, {
  name: 'ImpactCardAction',
  extends: 'Button',
  width: '100%',
  maxWidth: 320,
  minHeight: '$8',
  alignSelf: 'center',
  backgroundColor: '$background',
  borderWidth: 0,
  borderRadius: '$full',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 10 },
  shadowRadius: 24,
})

export const BalanceCardFrame = createComponent(Card, {
  name: 'BalanceCard',
  ...GOVERNANCE_CARD_LAYOUT,
  variants: {
    compact: {
      true: { maxWidth: 220, minHeight: 152 },
      false: { maxWidth: 268, minHeight: 176 },
    },
  } as const,
})

export const OptimisticVotingProposalCardFrame = createComponent(Card, {
  name: 'OptimisticVotingProposalCard',
  ...GOVERNANCE_CARD_LAYOUT,
  maxWidth: 480,
})

export const AlignmentVotingProposalCardFrame = createComponent(Card, {
  name: 'AlignmentVotingProposalCard',
  ...GOVERNANCE_CARD_LAYOUT,
  maxWidth: 480,
})

export const FundingDistributionChartFrame = createComponent(Card, {
  name: 'FundingDistributionChart',
  ...GOVERNANCE_CARD_LAYOUT,
  maxWidth: 340,
})

const GovernanceAmountValue = createComponent(Text, {
  name: 'GovernanceAmountValue',
  extends: 'Text',
  color: '$color',
  fontWeight: '700',
  variants: {
    amountSize: {
      sm: { fontSize: '$4', lineHeight: '$3' },
      md: { fontSize: '$6', lineHeight: '$4' },
      lg: { fontSize: '$8', lineHeight: '$6' },
      xl: { fontSize: '$10', lineHeight: '$8' },
    },
  } as const,
})

const GovernanceAmountToken = createComponent(Text, {
  name: 'GovernanceAmountToken',
  extends: 'Text',
  color: '$color',
  fontWeight: '700',
  variants: {
    amountSize: {
      sm: { fontSize: '$2', lineHeight: '$1' },
      md: { fontSize: '$4', lineHeight: '$2' },
      lg: { fontSize: '$5', lineHeight: '$3' },
      xl: { fontSize: '$6', lineHeight: '$4' },
    },
  } as const,
})

const CAPTION_SIZE: Record<GovernanceAmountSize, 'caption' | 'label'> = {
  sm: 'caption',
  md: 'caption',
  lg: 'label',
  xl: 'label',
}

export function renderGovernanceAmount(amount: GovernanceAmount, size: GovernanceAmountSize = 'lg') {
  return (
    <YStack gap="$1">
      {amount.token ? (
        <XStack alignItems="baseline" gap="$1">
          <GovernanceAmountToken amountSize={size}>
            {amount.token}
          </GovernanceAmountToken>
          <GovernanceAmountValue amountSize={size}>
            {formatCompactValue(amount.value)}
          </GovernanceAmountValue>
        </XStack>
      ) : (
        <Heading level={size === 'xl' ? 2 : 4}>{formatRawValue(amount.value)}</Heading>
      )}
      {amount.isStreaming ? (
        <Text variant={CAPTION_SIZE[size]} tone="secondary">
          {amount.streamLabel ?? 'Live stream'}
        </Text>
      ) : null}
    </YStack>
  )
}

export function ProposalHeader({ categoryLabel }: { categoryLabel: string }) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap="$3">
      <XStack
        alignItems="center"
        borderRadius="$full"
        backgroundColor="$backgroundHover"
        borderWidth={1}
        borderColor="$borderColorHover"
        paddingHorizontal="$3"
        paddingVertical="$2"
      >
        <Text variant="label" color="$primary" fontWeight="700">
          {categoryLabel}
        </Text>
      </XStack>
      <Icon name="chevron-right" size="sm" color="muted" />
    </XStack>
  )
}

export function resolveThemeColor(
  theme: Record<string, unknown>,
  key: string,
): string {
  const themeValue = theme[key]

  if (themeValue && typeof themeValue === 'object' && 'val' in themeValue) {
    return String((themeValue as { val: unknown }).val)
  }

  return typeof themeValue === 'string' ? themeValue : ''
}

export function ProgressBar({
  percentage,
  colorToken = '$primary',
  height = 8,
}: {
  percentage: number
  colorToken?: string
  height?: number
}) {
  return (
    <Stack height={height} borderRadius="$full" backgroundColor="$backgroundHover" overflow="hidden">
      <Stack width={`${clampPercentage(percentage)}%`} height="100%" backgroundColor={colorToken} />
    </Stack>
  )
}
