import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The builders season 5 page reads stored gbmetrics reports through "/gbmetrics/reports" and
 * "/gbmetrics/getReport". Tests answer both with page.route() so runs stay deterministic and never reach the
 * real service, and they record every request so the "reads only the two read endpoints" rule is checked.
 */
const INDEX_ROUTE = '**/gbmetrics/reports'
const REPORT_ROUTE = '**/gbmetrics/getReport*'

const TEAMS = ['Valor', 'UbeGames', 'ACTION-ORDER', 'Blockslide', 'Onward', 'Good drops', 'Delulu']

/** The Nov 15 report's shape: UbeGames has no GitHub keys, Good drops has no Farcaster key, and no return-rate keys exist yet. */
function buildReport(status: 'success' | 'partial' = 'success') {
  const full = (tx: number, gdVolume: number) => ({
    s5_project_tx_count: tx,
    s5_project_gd_volume: gdVolume,
    s5_project_gd_transfer_count: 3,
    project_active_users: 5,
    project_active_gd_users: 4,
    project_onboarded_gd_users: 1,
    github_commits: 24,
    github_prs_closed: 148,
    github_score: 1050,
    x_followers: 161,
    farcaster_followers: 3,
  })
  const withoutGithub = { ...full(1972, 0) } as Record<string, number>
  for (const key of ['github_commits', 'github_prs_closed', 'github_score']) delete withoutGithub[key]
  const withoutFarcaster = { ...full(11, 10) } as Record<string, number>
  delete withoutFarcaster.farcaster_followers
  return {
    '2026-11-15': {
      Valor: { results: full(1709, 1701511.364) },
      UbeGames: { results: withoutGithub },
      'ACTION-ORDER': { results: full(71, 20300.000056) },
      Blockslide: { results: full(40, 55) },
      Onward: { results: full(175, 20300) },
      'Good drops': { results: withoutFarcaster },
      Delulu: { results: full(549, 118270) },
    },
    _meta: { status, errors: [] },
  }
}

async function mockReports(page: Page, options: { reports?: string[]; status?: 'success' | 'partial'; reportStatus?: number } = {}) {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/gbmetrics/')) requests.push(`${request.method()} ${new URL(request.url()).pathname}${new URL(request.url()).search}`)
  })
  await page.route(INDEX_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ startDate: '2026-11-15', reports: options.reports ?? ['2026-11-15'] }),
    }),
  )
  await page.route(REPORT_ROUTE, (route) =>
    options.reportStatus && options.reportStatus !== 200
      ? route.fulfill({ status: options.reportStatus, contentType: 'application/json', body: '{"error":"x"}' })
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildReport(options.status)) }),
  )
  return requests
}

test.describe('latest report', () => {
  test('shows every card with every team named and valued, and reads only the two read endpoints', async ({ page }) => {
    const requests = await mockReports(page)
    await page.goto('/builders-s5')

    await expect(page.getByTestId('builders-headline')).toHaveText('Report of Sun, Nov 15, 2026. Totals since Sun, Nov 1, 2026.')
    await expect(page.getByTestId('builders-section-onchain-activity')).toBeVisible()
    await expect(page.getByTestId('builders-section-builder-activity')).toBeVisible()
    await expect(page.locator('[data-testid^="metric-card-"]')).toHaveCount(14)

    // Every team has its name and number in the transactions card, small teams and all.
    const tx = page.getByTestId('metric-carousel-s5_project_tx_count')
    for (const team of TEAMS) await expect(tx.getByTestId(`metric-tile-s5_project_tx_count-${team}`)).toContainText(team)
    await expect(page.getByTestId('metric-tile-s5_project_tx_count-Valor')).toContainText('1,709')
    await expect(page.getByTestId('metric-tile-s5_project_tx_count-Blockslide')).toContainText('40')
    await expect(page.getByTestId('metric-tile-s5_project_gd_volume-UbeGames')).toContainText('G$ 0')
    await expect(page.getByTestId('metric-tile-s5_project_gd_volume-Valor')).toContainText('G$ 1.7M')
    await expect(page.getByTestId('metric-exact-s5_project_gd_volume')).toContainText('Valor G$ 1,701,511')
    await tx.getByRole('button', { name: 'Next' }).click()
    await expect(tx.getByTestId('metric-chart-s5_project_tx_count')).toBeVisible()

    // The page reads these two endpoints and nothing else. (React StrictMode runs effects twice in the dev server,
    // so each request can appear twice here; what matters is which requests are made.)
    expect([...new Set(requests)]).toEqual(['GET /gbmetrics/reports', 'GET /gbmetrics/getReport?date=2026-11-15'])
  })

  test('names the teams with no registered account instead of drawing zeros', async ({ page }) => {
    await mockReports(page)
    await page.goto('/builders-s5')
    await expect(page.getByTestId('metric-missing-github_commits')).toHaveText('No GitHub repo registered: UbeGames')
    await expect(page.getByTestId('metric-missing-farcaster_followers')).toHaveText('No Farcaster account registered: Good drops')
  })

  test('retention cards say when their first value comes', async ({ page }) => {
    await mockReports(page)
    await page.goto('/builders-s5')
    await expect(page.getByTestId('metric-placeholder-s5_project_retention_week1')).toHaveText('First value in the Nov 29 report.')
    await expect(page.getByTestId('metric-placeholder-s5_project_retention_epoch')).toHaveText('First value in the Dec 13 report.')
    await expect(page.getByTestId('metric-placeholder-s5_project_retention_week4')).toHaveText('First value in the Dec 20 report.')
  })

  test('does not overflow the screen width', async ({ page }) => {
    await mockReports(page)
    await page.goto('/builders-s5')
    await expect(page.getByTestId('builders-headline')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('states', () => {
  test('no stored report', async ({ page }) => {
    await mockReports(page, { reports: [] })
    await page.goto('/builders-s5')
    await expect(page.getByTestId('builders-no-report')).toContainText('No report yet.')
    await expect(page.locator('[data-testid^="metric-card-"]')).toHaveCount(0)
  })

  test('gbmetrics down shows the unavailable message and a working Try again', async ({ page }) => {
    let down = true
    await page.route(INDEX_ROUTE, (route) =>
      down
        ? route.fulfill({ status: 503, body: 'unavailable' })
        : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reports: ['2026-11-15'] }) }),
    )
    await page.route(REPORT_ROUTE, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildReport()) }),
    )
    await page.goto('/builders-s5')
    await expect(page.getByTestId('builders-unavailable')).toContainText('The builders report is unavailable right now')
    await expect(page.locator('[data-testid^="metric-card-"]')).toHaveCount(0)

    down = false
    await page.getByTestId('builders-retry').click()
    await expect(page.getByTestId('builders-unavailable')).toBeHidden()
    await expect(page.locator('[data-testid^="metric-card-"]')).toHaveCount(14)
  })

  test('a 404 on the selected report is the unavailable message, not an empty page', async ({ page }) => {
    await mockReports(page, { reportStatus: 404 })
    await page.goto('/builders-s5')
    await expect(page.getByTestId('builders-unavailable')).toBeVisible()
  })

  test('a partial report shows the banner and does not blame the registry for missing numbers', async ({ page }) => {
    await mockReports(page, { status: 'partial' })
    await page.goto('/builders-s5')
    await expect(page.getByTestId('builders-partial-banner')).toContainText('This report finished with errors; some numbers may be missing.')
    await expect(page.getByTestId('metric-missing-github_commits')).toHaveText('Not measured in this report: UbeGames')
  })
})

test('the root lists both dashboards, each at its own path', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Builders Season 5' })).toHaveAttribute('href', '/builders-s5')
  await expect(page.getByRole('link', { name: 'AI Credits' })).toHaveAttribute('href', '/ai-credits')
})
