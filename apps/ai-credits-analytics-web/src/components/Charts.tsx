import { Stack, Text, Card } from 'tamagui'
import { LineAreaChart, BarChart } from '@goodwidget/ui'
import { TransformedDailyData } from '../utils/analytics'

interface GVolumeChartProps {
  dailyData: TransformedDailyData[]
}

export function GVolumeChart({ dailyData }: GVolumeChartProps) {
  if (dailyData.length === 0) {
    return (
      <Card padding={4} alignItems="center" justifyContent="center" minHeight={300}>
        <Text color="textSecondary">No data available for G$ Volume</Text>
      </Card>
    )
  }

  const chartData = dailyData.map((day) => ({
    date: day.date,
    'One-time Deposits': day.gDeposited,
    'Streamed': day.gStreamed,
  }))

  return (
    <Card padding={4} flex={1} minWidth={0}>
      <Text fontSize={5} fontWeight="600" marginBottom={3}>
        G$ Volume
      </Text>
      <LineAreaChart
        data={chartData}
        xKey="date"
        yKeys={['One-time Deposits', 'Streamed']}
        colors={['$primary', '$secondary']}
        stacked={true}
        height={350}
        showGrid
        showTooltip
        tooltipFormatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' G$'}
      />
    </Card>
  )
}

interface AiCreditsChartProps {
  dailyData: TransformedDailyData[]
}

export function AiCreditsChart({ dailyData }: AiCreditsChartProps) {
  if (dailyData.length === 0) {
    return (
      <Card padding={4} alignItems="center" justifyContent="center" minHeight={300}>
        <Text color="textSecondary">No data available for AI Credits</Text>
      </Card>
    )
  }

  const chartData = dailyData.map((day) => ({
    date: day.date,
    'AI Credits (USD)': day.aiCreditsUsd,
  }))

  return (
    <Card padding={4} flex={1} minWidth={0}>
      <Text fontSize={5} fontWeight="600" marginBottom={3}>
        AI Credits Used per Day (USD)
      </Text>
      <BarChart
        data={chartData}
        xKey="date"
        yKeys={['AI Credits (USD)']}
        colors={['$info']}
        height={350}
        showGrid
        showTooltip
        tooltipFormatter={(value) => '$' + value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      />
    </Card>
  )
}

interface WalletsChartProps {
  dailyData: TransformedDailyData[]
}

export function WalletsChart({ dailyData }: WalletsChartProps) {
  if (dailyData.length === 0) {
    return (
      <Card padding={4} alignItems="center" justifyContent="center" minHeight={300}>
        <Text color="textSecondary">No data available for Unique Wallets</Text>
      </Card>
    )
  }

  const chartData = dailyData.map((day) => ({
    date: day.date,
    'G$ Buyers': day.walletsG,
    'Credit Users': day.walletsAi,
  }))

  return (
    <Card padding={4} flex={1} minWidth={0}>
      <Text fontSize={5} fontWeight="600" marginBottom={3}>
        Unique Wallets per Day
      </Text>
      <LineAreaChart
        data={chartData}
        xKey="date"
        yKeys={['G$ Buyers', 'Credit Users']}
        colors={['$primary', '$success']}
        stacked={false}
        height={350}
        showGrid
        showTooltip
        tooltipFormatter={(value) => value.toLocaleString() + ' wallets'}
      />
    </Card>
  )
}
