import { expect, test, type Page } from '@playwright/test'

const STORY_IDS = {
  loading: '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--loading&viewMode=story',
  live: '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--live&viewMode=story',
  demo: '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--demo&viewMode=story',
  liveUnavailable:
    '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--live-unavailable&viewMode=story',
  empty: '/iframe.html?id=qa-aicreditsdashboard-runtime-fixtures--empty&viewMode=story',
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
  await expect(root.getByText('Loading analytics…')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/gooddata-widget/test-results/gdw-01-loading.png',
    fullPage: true,
  })
})

test('AiCreditsDashboard live state — scorecards, charts, and table render from real data', async ({ page }) => {
  await gotoStory(page, STORY_IDS.live)
  const root = await expectWidget(page, 'GoodDataWidget-live')
  await expect(root.getByTestId('demo-banner')).not.toBeVisible()
  await expect(root.getByTestId('scorecard-total-gd')).toBeVisible()
  await expect(root.getByTestId('scorecard-ai-credits')).toBeVisible()
  await expect(root.getByTestId('scorecard-flow-rate')).toBeVisible()
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

test('AiCreditsDashboard live-unavailable state — placeholders instead of empty charts/table', async ({ page }) => {
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
