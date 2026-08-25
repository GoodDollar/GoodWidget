import { LineAreaChart } from '@goodwidget/ui'
import { formatShortDate } from '../utils/format'
import type { ChartDataPoint } from '../types/analytics'

interface VolumeChartProps {
  data: ChartDataPoint[]
  isLoading: boolean
}

export function VolumeChart({ data, isLoading }: VolumeChartProps) {
  if (isLoading || data.length === 0) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        Loading G$ Volume chart...
      </div>
    )
  }

  // Get unique series
  const series = [...new Set(data.map(d => d.series).filter(Boolean))] as string[]

  return (
    <div style={{ height: 350 }}>
      <LineAreaChart
        data={data}
        series={series.map((key, index) => ({
          key,
          label: key,
          color: index === 0 ? '$colorPrimary' : '$colorSecondary',
        }))}
        showArea={true}
        showDots={false}
        xAxisFormatter={formatShortDate}
        yAxisFormatter={(value) => `${(value / 1e6).toFixed(1)}M`}
        style={{ height: '100%' }}
      />
    </div>
  )
}