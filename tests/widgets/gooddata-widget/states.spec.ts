import { expect, test, type Page } from '@playwright/test'

const STORY_IDS = {
  loading: '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--loading&viewMode=story',
  live: '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--live&viewMode=story',
  demo: '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--demo&viewMode=story',
  liveUnavailable:
    '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--live-unavailable&viewMode=story',
  empty: '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--empty&viewMode=story',
  realisticVolume:
    '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--realistic-volume&viewMode=story',
} as const

async function gotoStory(page: Page, storyUrl: string): Promise<void> {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
}

async function expectWidget(page: Page, testId: string) {
  const root = page.getByTestId(testId)
  await expect(root).toBeVisible({ timeout: 20_000 })
  return root
}

test('AiCreditsDashboard loading state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.loading)
  const root = await expectWidget(page, 'GoodDataWidget-loading')
  await expect(root.getByTestId('dashboard-loading-skeleton')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/gooddata-widget/test-results/gdw-01-loading.png',
    fullPage: true,
  })
})

test('AiCreditsDashboard live state — scorecards, charts, and table render from real data', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.live)
  const root = await expectWidget(page, 'GoodDataWidget-live')
  await expect(root.getByTestId('demo-banner')).not.toBeVisible()
  const totalGdScorecard = root.getByTestId('scorecard-total-gd')
  await expect(totalGdScorecard).toBeVisible()
  await expect(totalGdScorecard).toContainText('Total Credits Bought in G$')
  await expect(totalGdScorecard).toContainText('USD')
  await expect(totalGdScorecard).toContainText('in subscription (streaming)')
  await expect(root.getByTestId('scorecard-ai-credits')).toBeVisible()
  const flowRateScorecard = root.getByTestId('scorecard-flow-rate')
  await expect(flowRateScorecard).toBeVisible()
  await expect(flowRateScorecard).toContainText('Total Monthly Subscriptions')
  await expect(root.getByTestId('chart-gd-volume')).toBeVisible()
  await expect(root.getByTestId('chart-ai-credits')).toBeVisible()
  await expect(root.getByTestId('chart-unique-wallets')).toBeVisible()
  await expect(root.getByTestId('daily-summary')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/gooddata-widget/test-results/gdw-02-live.png',
    fullPage: true,
  })
})

test('AiCreditsDashboard demo state — shows the demo-data banner', async ({ page }) => {
  await gotoStory(page, STORY_IDS.demo)
  const root = await expectWidget(page, 'GoodDataWidget-demo')
  await expect(root.getByTestId('demo-banner')).toBeVisible()
  await expect(root.getByTestId('scorecard-total-gd')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/gooddata-widget/test-results/gdw-03-demo.png',
    fullPage: true,
  })
})

test('AiCreditsDashboard live-unavailable state — placeholders instead of empty charts/table', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.liveUnavailable)
  const root = await expectWidget(page, 'GoodDataWidget-live-unavailable')
  await expect(root.getByTestId('section-placeholder').first()).toBeVisible()
  await expect(root.getByTestId('chart-gd-volume')).not.toBeVisible()
  await expect(root.getByTestId('daily-summary')).not.toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/gooddata-widget/test-results/gdw-04-live-unavailable.png',
    fullPage: true,
  })
})

test('AiCreditsDashboard empty state — no daily records', async ({ page }) => {
  await gotoStory(page, STORY_IDS.empty)
  const root = await expectWidget(page, 'GoodDataWidget-empty')
  await expect(root.getByTestId('section-placeholder').first()).toBeVisible()
  await expect(root.getByTestId('daily-summary')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/gooddata-widget/test-results/gdw-05-empty.png',
    fullPage: true,
  })
})

// Guards fix #4: the G$ Volume chart's secondaryYAxis must keep the streamed
// series legible even at realistic production magnitudes (sparse, much-larger
// one-time deposit spikes vs a narrower, independently-moving streamed band),
// not just the smooth demo/live ramp — both axis labels must render.
test('AiCreditsDashboard live state — G$ Volume dual-axis stays legible at realistic magnitude disparity', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.realisticVolume)
  const root = await expectWidget(page, 'GoodDataWidget-realistic-volume')
  const volumeChart = root.getByTestId('chart-gd-volume')
  await expect(volumeChart).toBeVisible()
  // Axis titles render as <text> nodes inside the chart's own <svg>; the legend renders as a
  // separate sibling YStack below it and would also match "Deposits"/"Streamed" text, letting
  // this assertion pass even if the axis titles themselves were broken. Scoping to the <svg>
  // guards specifically what this test is meant to guard: axis-title legibility.
  const volumeChartSvg = volumeChart.locator('svg')
  // The rotated axis title can wrap onto two lines (each its own text node), so
  // match the distinctive word rather than the full label string.
  await expect(volumeChartSvg.getByText('Deposits', { exact: false }).first()).toBeVisible()
  await expect(volumeChartSvg.getByText('Streamed', { exact: false }).first()).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/gooddata-widget/test-results/gdw-06-realistic-volume.png',
    fullPage: true,
  })
})
