import { Badge, BadgeText, Card, Heading, Stepper, Text, XStack, YStack } from '@goodwidget/ui'
import { resolveStakeSummary } from '../resolveStakeSummary'
import type { StepperStepItem } from '@goodwidget/ui'

interface StakeStepContentProps {
  stakeAmountLabel: string
  transactionSteps: StepperStepItem[]
}

function resolveProgress(steps: StepperStepItem[]): { completed: number; total: number; percent: number } {
  const total = steps.length
  const completed = steps.filter((step) => step.status === 'completed').length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  return { completed, total, percent }
}

export function StakeStepContent({ stakeAmountLabel, transactionSteps }: StakeStepContentProps) {
  const stakeSummary = resolveStakeSummary(transactionSteps)
  const progress = resolveProgress(transactionSteps)

  return (
    <YStack gap="$3">
      <Card elevated>
        <YStack gap="$3">
          <YStack gap="$2">
            <XStack alignItems="flex-start" justifyContent="space-between" gap="$2" flexWrap="wrap">
              <YStack gap="$1" flex={1} minWidth={0}>
                <Text variant="caption" tone="secondary">
                  {`${stakeAmountLabel} locked stake`}
                </Text>
                {/* level 5 avoids overflow on narrow mobile cards */}
                <Heading level={5}>{`Creating profile & staking`}</Heading>
              </YStack>
              <Badge type={stakeSummary.badgeType}>
                <BadgeText>{stakeSummary.title}</BadgeText>
              </Badge>
            </XStack>
          </YStack>

          <XStack alignItems="center" gap="$3">
            <YStack flex={1} height={8} borderRadius="$full" backgroundColor="$borderColor" overflow="hidden">
              <YStack
                height="100%"
                width={`${progress.percent}%`}
                backgroundColor="$primary"
                borderRadius="$full"
              />
            </YStack>
            <Text fontWeight="700" color="$primary">
              {`${progress.completed}/${progress.total}`}
            </Text>
          </XStack>

          <Text tone="secondary">{stakeSummary.description}</Text>

          <Stepper steps={transactionSteps} palette="primary" maxHeight={320} />
        </YStack>
      </Card>
    </YStack>
  )
}
