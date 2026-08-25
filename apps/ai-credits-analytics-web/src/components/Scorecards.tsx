import { Stack, Text } from 'tamagui'
import { Scorecard } from '@goodwidget/ui'
import { formatGdollars, formatCurrency } from '../utils/analytics'

interface ScorecardsProps {
  totalGSpent: number
  totalAiCreditsUsd: number
  currentFlowRateDaily: number
}

export function Scorecards({ totalGSpent, totalAiCreditsUsd, currentFlowRateDaily }: ScorecardsProps) {
  return (
    <Stack direction="row" gap={4} flexWrap="wrap" width="100%">
      <Scorecard
        title="Total G$ Spent"
        value={formatGdollars(totalGSpent, 0)}
        subtitle="All-time G$ volume"
        width="100%"
        maxWidth={400}
        flex={1}
        minWidth={280}
      />
      <Scorecard
        title="AI Credits Used (USD)"
        value={formatCurrency(totalAiCreditsUsd, '$', 0)}
        subtitle="All-time AI credits consumption"
        width="100%"
        maxWidth={400}
        flex={1}
        minWidth={280}
      />
      <Scorecard
        title="G$ Flow Rate (G$/day)"
        value={formatGdollars(currentFlowRateDaily, 2)}
        subtitle="Current streaming rate"
        width="100%"
        maxWidth={400}
        flex={1}
        minWidth={280}
      />
    </Stack>
  )
}
