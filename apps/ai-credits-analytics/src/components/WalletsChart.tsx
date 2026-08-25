import { LineAreaChart } from '@goodwidget/ui'
import { formatShortDate } from '../utils/format'
import type { ChartDataPoint } from '../types/analytics'

interface WalletsChartProps {
  data: ChartDataPoint[]
  isLoading: boolean
}

export function WalletsChart({ data, isLoading }: WalletsChartProps) {
  if (isLoading || data.length === 0) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        Loading Unique Wallets chart...
      </div>
    )
  )

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
        showArea={false}
        showDots={true}
        xAxisFormatter={formatShortDate}
        yAxisFormatter={(value) => value.toLocaleString()}
        style={{ height: '100%' }}
      />
    </div>
  )
}