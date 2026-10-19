import { expect, test, type Page } from '@playwright/test'

async function gotoStory(page: Page, storyId: string) {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
  await page.waitForLoadState('networkidle')
}

test('showcase demo exposes active and previous governance rounds with live allocation controls', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1100 })
  await gotoStory(page, 'widgets-governancewidget-showcase--demo')

  const activeVote = page.getByTestId('GovernanceWidget-active-governance')
  await expect(activeVote).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-past-governance-1')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-funding-distribution')).toContainText('450')
  await expect(page.getByTestId('GovernanceWidget-member-footer')).toContainText('Status: active')
  await expect(page.getByTestId('GovernanceWidget-member-footer')).toHaveCSS('position', 'fixed')
  const widgetBox = await page.getByTestId('GovernanceWidget-showcase-demo').boundingBox()
  const footerBox = await page.getByTestId('GovernanceWidget-member-footer').boundingBox()
  expect(widgetBox).not.toBeNull()
  expect(footerBox).not.toBeNull()
  expect(footerBox?.width).toBeLessThan(page.viewportSize()?.width ?? 0)
  expect(Math.abs((footerBox?.width ?? 0) - (widgetBox?.width ?? 0))).toBeLessThanOrEqual(2)

  const carouselMetrics = await page.getByTestId('GovernanceWidget-voting-carousel').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(carouselMetrics.scrollWidth).toBeGreaterThan(carouselMetrics.clientWidth)
  await expect(page.getByText('Voting round 1 of 2')).toBeVisible()
  await page.getByRole('button', { name: 'Next voting round' }).click()
  await expect(page.getByText('Voting round 2 of 2')).toBeVisible()
  await expect.poll(async () => page.getByTestId('GovernanceWidget-voting-carousel').evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Previous voting round' }).click()
  await expect(page.getByText('Voting round 1 of 2')).toBeVisible()

  await activeVote.click()
  await expect(page.getByTestId('GovernanceWidget-vote-detail')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-vote-available-points')).toHaveText('Available points: 800 bps')

  const sliders = page.locator('input[type="range"]')
  await expect(sliders).toHaveCount(3)
  await sliders.nth(0).fill('5000')
  await expect(page.getByText('Allocation total: 10000 / 10,000 bps')).toBeVisible()
  await expect(page.getByTestId('GovernanceWidget-vote-available-points')).toHaveText('Available points: 0 bps')

  const backButton = page.getByRole('button', { name: 'Back' })
  await expect(backButton).toHaveCSS('background-color', /rgb\(/)
  await backButton.click()
  await expect(activeVote).toBeVisible()
})

test('onboarding Back returns to the welcome step and Skip stays visually secondary', async ({ page }) => {
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--unstaked-returns-to-onboarding')

  const skipButton = page.getByTestId('GovernanceWidget-skip-onboarding')
  await expect(skipButton).toHaveCSS('border-width', '1px')
  await expect(skipButton).toHaveCSS('height', '32px')
  await skipButton.click()
  await expect(page.getByTestId('GovernanceWidget-signup-banner')).toBeVisible()

  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--unstaked-returns-to-onboarding')
  await page.getByRole('button', { name: 'Proceed to Membership' }).click()
  await expect(page.getByTestId('GovernanceOnboardingWidget-back')).toBeVisible()
  await page.getByTestId('GovernanceOnboardingWidget-back').click()
  await expect(page.getByRole('button', { name: 'Proceed to Membership' })).toBeVisible()
})
