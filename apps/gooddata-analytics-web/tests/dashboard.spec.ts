import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The dashboard talks to a real external Worker (see analyticsApi.ts). Tests
 * mock both endpoints via page.route() rather than hitting the live service,
 * so runs stay deterministic and never trigger a real server-side refresh.
 */
const ANALYTICS_ROUTE = '**/v1/analytics*'
const REFRESH_ROUTE = '**/v1/analytics/refresh'

interface MockDailyRecord {
  date: string
  gdOneTimeDepositsWei: string
  gdStreamedWei: string
  gdTotalFlowRateWeiPerSecond: string
  aiCreditsUsedWei: string
  uniqueGdSigners: number
  uniqueCreditUsers: number
  updatedAt: string
  missing: boolean
}

function buildDailyRecord(daysAgo: number): MockDailyRecord {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return {
    date: date.toISOString().slice(0, 10),
    gdOneTimeDepositsWei: '1000000000000000000000',
    gdStreamedWei: '500000000000000000000',
    gdTotalFlowRateWeiPerSecond: '5000000000000',
    aiCreditsUsedWei: '75000000',
    uniqueGdSigners: 4,
    uniqueCreditUsers: 2,
    updatedAt: new Date().toISOString(),
    missing: false,
  }
}

function buildMockAnalyticsResponse(dayCount: number, dailyOverride?: MockDailyRecord[]) {
  const daily = dailyOverride ?? Array.from({ length: dayCount }, (_, index) => buildDailyRecord(dayCount - 1 - index))
  const nowIso = new Date().toISOString()
  return {
    days: dayCount,
    daily,
    global: {
      gdOneTimeDepositsWei: '10000000000000000000000',
      gdStreamedWei: '5000000000000000000000',
      aiCreditsUsedWei: '750000000',
      gdTotalFlowRateWeiPerSecond: '5000000000000',
      updatedAt: nowIso,
    },
    lastRun: {
      currentDate: nowIso.slice(0, 10),
      updatedAt: nowIso,
    },
  }
}

/** Fulfills the live analytics GET with a fixed payload. */
async function mockAnalyticsSuccess(page: Page, response: ReturnType<typeof buildMockAnalyticsResponse>) {
  await page.route(ANALYTICS_ROUTE, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) }),
  )
}

/** Fails the live analytics GET, forcing the demo-data fallback. */
async function mockAnalyticsFailure(page: Page) {
  await page.route(ANALYTICS_ROUTE, (route) => route.fulfill({ status: 503, body: 'unavailable' }))
}

/** Fulfills the refresh POST, echoing the current mock payload back afterwards. */
async function mockRefreshSuccess(page: Page) {
  await page.route(REFRESH_ROUTE, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
}

test.describe('live data', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnalyticsSuccess(page, buildMockAnalyticsResponse(15))
    await mockRefreshSuccess(page)
    await page.goto('/')
  })

  test('renders scorecards, charts, and the daily table without the demo banner', async ({ page }) => {
    await expect(page.getByTestId('demo-banner')).toBeHidden()
    await expect(page.getByTestId('scorecard-total-gd')).toBeVisible()
    await expect(page.getByTestId('scorecard-ai-credits')).toBeVisible()
    await expect(page.getByTestId('scorecard-flow-rate')).toBeVisible()

    await expect(page.getByTestId('chart-gd-volume')).toBeVisible()
    await expect(page.getByTestId('chart-ai-credits')).toBeVisible()
    await expect(page.getByTestId('chart-unique-wallets')).toBeVisible()
    await expect(page.getByTestId('section-placeholder')).toHaveCount(0)

    await expect(page.getByTestId('daily-summary-table')).toBeVisible()
  })

  test('refresh button shows a loading state while the request is in flight', async ({ page }) => {
    const refreshButton = page.getByTestId('refresh-button')
    await refreshButton.click()
    await expect(refreshButton).toHaveText('Refreshing…')
    await expect(refreshButton).toHaveText('Refresh')
  })
})

test.describe('demo fallback', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnalyticsFailure(page)
    await page.goto('/')
  })

  test('falls back to demo data and shows the demo banner when the live endpoint fails', async ({ page }) => {
    await expect(page.getByTestId('demo-banner')).toBeVisible()
    await expect(page.getByTestId('chart-gd-volume')).toBeVisible()
    await expect(page.getByTestId('daily-summary-table')).toBeVisible()
  })

  test('toggling to Live while unavailable shows an inline message and keeps the toggle clickable', async ({
    page,
  }) => {
    const liveToggle = page.getByTestId('toggle-live')
    await liveToggle.click()

    await expect(page.getByTestId('charts-section').getByText(/Live endpoint not yet deployed/)).toBeVisible()
    await expect(page.getByTestId('table-section').getByText(/Live endpoint not yet deployed/)).toBeVisible()

    // The button must stay clickable in this state, not become disabled —
    // clicking it again is how the user re-checks live availability.
    await liveToggle.click()
    await expect(page.getByTestId('demo-banner')).toBeHidden()
    await liveToggle.click()
    await expect(page.getByTestId('charts-section').getByText(/Live endpoint not yet deployed/)).toBeVisible()
  })
})

test.describe('empty state', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnalyticsSuccess(page, buildMockAnalyticsResponse(0, []))
    await page.goto('/')
  })

  test('shows placeholders when there are no daily records', async ({ page }) => {
    await expect(page.getByTestId('charts-section').getByText('No daily data yet. Charts will appear once activity starts.')).toBeVisible()
    await expect(page.getByText('No data recorded yet. The table will populate once transactions occur.')).toBeVisible()
  })
})

test.describe('table pagination', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnalyticsSuccess(page, buildMockAnalyticsResponse(25))
    await page.goto('/')
  })

  test('pages through the daily summary table 10 rows at a time', async ({ page }) => {
    const pageInfo = page.getByTestId('page-info')
    await expect(pageInfo).toHaveText('Page 1 of 3')
    await expect(page.getByTestId('page-first')).toBeDisabled()
    await expect(page.getByTestId('page-prev')).toBeDisabled()
    await expect(page.getByTestId('page-next')).toBeEnabled()
    await expect(page.getByTestId('page-last')).toBeEnabled()

    await page.getByTestId('page-next').click()
    await expect(pageInfo).toHaveText('Page 2 of 3')
    await expect(page.getByTestId('page-first')).toBeEnabled()
    await expect(page.getByTestId('page-prev')).toBeEnabled()

    await page.getByTestId('page-last').click()
    await expect(pageInfo).toHaveText('Page 3 of 3')
    await expect(page.getByTestId('page-next')).toBeDisabled()
    await expect(page.getByTestId('page-last')).toBeDisabled()

    await page.getByTestId('page-first').click()
    await expect(pageInfo).toHaveText('Page 1 of 3')
  })
})
