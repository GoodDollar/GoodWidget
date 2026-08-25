import { BarChart } from '@goodwidget/ui'
import { formatShortDate } from '../utils/format'
import type { ChartDataPoint } from '../types/analytics'

interface CreditsChartProps {
  data: ChartDataPoint[]
  isLoading: boolean
}

export function CreditsChart({ data, isLoading }: CreditsChartProps) {
  if (isLoading || data.length === 0) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        Loading AI Credits chart...
      </div>
    )
  }

  const chartData = data.map((point) => ({
    category: formatShortDate(point.x),
    value: point.y,
  }))

  return (
    <div style={{ height: 350 }}>
      <BarChart
        data={chartData}
        layout="vertical"
        valueFormatter={(value) => value.toLocaleString()}
        style={{ height: '100%' }}
      />
    </div>
  )
}