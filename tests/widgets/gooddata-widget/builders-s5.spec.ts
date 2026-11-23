import { expect, test, type Page } from '@playwright/test'

const STORIES = {
  latest: '/iframe.html?id=qa-builderss5dashboard-runtime-fixtures--latest-report&viewMode=story',
  partial: '/iframe.html?id=qa-builderss5dashboard-runtime-fixtures--partial-report&viewMode=story',
  noReport: '/iframe.html?id=qa-builderss5dashboard-runtime-fixtures--no-report-yet&viewMode=story',
  unavailable: '/iframe.html?id=qa-builderss5dashboard-runtime-fixtures--report-unavailable&viewMode=story',
  loading: '/iframe.html?id=qa-builderss5dashboard-runtime-fixtures--loading&viewMode=story',
} as const

const SHOTS = 'tests/widgets/gooddata-widget/test-results'
const DESKTOP = { width: 1100, height: 900 }
const PHONE = { width: 390, height: 844 }

async function openStory(page: Page, url: string, viewport = DESKTOP) {
  await page.setViewportSize(viewport)
  await page.goto(url)
  const root = page.getByTestId('builders-s5-dashboard')
  await expect(root).toBeVisible({ timeout: 20_000 })
  return root
}

test('BuildersS5Dashboard latest report on desktop — every card, every team named and valued', async ({ page }) => {
  const root = await openStory(page, STORIES.latest)
  await expect(root.getByTestId('builders-headline')).toHaveText('Report of Sun, Nov 15, 2026. Totals since Sun, Nov 1, 2026.')
  await expect(root.locator('[data-testid^="metric-card-"]')).toHaveCount(14)
  await expect(root.getByTestId('metric-chart-s5_project_tx_count-value-Blockslide')).toHaveText('40')
  await expect(root.getByTestId('metric-chart-s5_project_gd_volume-value-UbeGames')).toHaveText('G$ 0')
  await expect(root.getByTestId('metric-missing-github_commits')).toHaveText('No GitHub repo registered: UbeGames')
  // Numbers from the real 2026-11-15 report (the story fixture is that report, unchanged).
  await expect(root.getByTestId('metric-chart-project_active_users-value-UbeGames')).toHaveText('479')
  await expect(root.getByTestId('metric-chart-project_active_gd_users-value-ACTION-ORDER')).toHaveText('45')
  await expect(root.getByTestId('metric-chart-project_onboarded_gd_users-value-ACTION-ORDER')).toHaveText('36')
  await expect(root.getByTestId('metric-chart-s5_project_gd_transfer_count-value-Onward')).toHaveText('180')
  await expect(root.getByTestId('metric-chart-github_prs_closed-value-Delulu')).toHaveText('222')
  await expect(root.getByTestId('metric-chart-x_followers-value-Valor')).toHaveText('161')
  await expect(root.getByTestId('metric-placeholder-s5_project_retention_week1')).toHaveText('First value in the Nov 29 report.')
  await expect(root.getByTestId('metric-placeholder-s5_project_retention_week4')).toHaveText('First value in the Dec 20 report.')
  await page.screenshot({ path: `${SHOTS}/bs5-01-latest-desktop.png`, fullPage: true })
})

test('BuildersS5Dashboard latest report at 390 px — no horizontal overflow', async ({ page }) => {
  const root = await openStory(page, STORIES.latest, PHONE)
  await expect(root.locator('[data-testid^="metric-card-"]')).toHaveCount(14)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: `${SHOTS}/bs5-02-latest-390.png`, fullPage: true })
})

test('BuildersS5Dashboard partial report — banner shown, missing numbers not blamed on the registry', async ({ page }) => {
  const root = await openStory(page, STORIES.partial)
  await expect(root.getByTestId('builders-partial-banner')).toBeVisible()
  await expect(root.getByTestId('metric-missing-github_commits')).toHaveText('Not measured in this report: UbeGames')
  await page.screenshot({ path: `${SHOTS}/bs5-03-partial.png` })
})

test('BuildersS5Dashboard no stored report yet', async ({ page }) => {
  const root = await openStory(page, STORIES.noReport)
  await expect(root.getByTestId('builders-no-report')).toContainText('No report yet.')
  await page.screenshot({ path: `${SHOTS}/bs5-04-no-report.png` })
})

test('BuildersS5Dashboard report unavailable — message and Try again, no numbers', async ({ page }) => {
  const root = await openStory(page, STORIES.unavailable)
  await expect(root.getByTestId('builders-unavailable')).toContainText('The builders report is unavailable right now')
  await expect(root.getByTestId('builders-retry')).toBeVisible()
  await expect(root.locator('[data-testid^="metric-card-"]')).toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/bs5-05-unavailable.png` })
})

test('BuildersS5Dashboard loading skeleton', async ({ page }) => {
  const root = await openStory(page, STORIES.loading)
  await expect(root.getByTestId('builders-loading-skeleton')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/bs5-06-loading.png` })
})
