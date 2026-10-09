import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('renders the dark standalone Superfluid campaign page', async ({ page }) => {
  await expect(page.getByTestId('superfluid-campaign-page')).toBeVisible()
  await expect(page.getByTestId('superfluid-campaign-frame')).toBeVisible()
  await expect(page.getByText('Superfluid Ecosystem Rewards')).toBeVisible()

  const background = await page.getByTestId('superfluid-campaign-page').evaluate((element) =>
    getComputedStyle(element).backgroundImage,
  )
  expect(background).toContain('gradient')
})

test('uses wide content on desktop while preserving the mobile cap', async ({ page }) => {
  const frame = page.getByTestId('superfluid-campaign-frame')
  const viewport = page.viewportSize()
  const frameBounds = await frame.boundingBox()

  expect(frameBounds).not.toBeNull()
  expect(viewport).not.toBeNull()

  if (viewport!.width > 480) {
    expect(frameBounds!.width).toBeGreaterThan(480)
    expect(frameBounds!.width).toBeLessThanOrEqual(960)
  } else {
    expect(frameBounds!.width).toBeLessThanOrEqual(480)
  }
})
