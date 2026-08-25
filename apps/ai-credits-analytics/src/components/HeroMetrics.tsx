import { Scorecard } from '@goodwidget/ui'
import { formatCompact } from '../utils/format'
import type { ProcessedGlobalData } from '../types/analytics'

interface HeroMetricsProps {
  globalData: ProcessedGlobalData | null
  isLoading: boolean
}

export function HeroMetrics({ globalData, isLoading }: HeroMetricsProps) {
  if (isLoading || !globalData) {
    return (
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>{
        [1, 2, 3].map((i) => (
          <Scorecard
            key={i}
            value="—"
            label="Loading..."
            variant="card"
            style={{ flex: 1, minWidth: 200 }}
          />
        ))
      }</div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>{
      [
        {
          value: formatCompact(globalData.totalGdVolume),
          label: 'Total G$ Volume',
          suffix: ' G$',
        },
        {
          value: formatCompact(globalData.totalAiCreditsUsed),
          label: 'Total AI Credits Used',
          suffix: ' credits',
        },
        {
          value: formatCompact(globalData.totalFlowRateDaily),
          label: 'Current Daily Flow Rate',
          suffix: ' G$/day',
        },
      ].map((metric, index) => (
        <Scorecard
          key={index}
          value={metric.value}
          label={metric.label}
          suffix={metric.suffix}
          variant="card"
          style={{ flex: 1, minWidth: 200 }}
        />
      ))
    }</div>
  )
}