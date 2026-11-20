import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('renders the purchase widget and security section without an injected wallet', async ({
  page,
}) => {
  await expect(page.getByTestId('wallet-fallback')).toBeVisible()
  await expect(page.getByText('Know what your API key can do and what is at risk')).toBeVisible()
})

test('drops the Antseed desktop copy and docs links', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Read the Antseed API docs' })).toHaveCount(0)
  await expect(page.getByText('signer', { exact: false })).toHaveCount(0)
  await expect(page.getByText('Antseed Desktop', { exact: false })).toHaveCount(0)
})

test('drops the marketing sections that the widget now covers itself', async ({ page }) => {
  await expect(page.getByTestId('benefits-strip')).toHaveCount(0)
  await expect(page.getByTestId('agent-skills')).toHaveCount(0)
  await expect(page.getByTestId('shared-setup-commands')).toHaveCount(0)
  await expect(page.getByText('How your AI credits work')).toHaveCount(0)
  await expect(page.getByText('Connect your local agent workflow')).toHaveCount(0)
  await expect(page.getByText('Buy credits with your wallet')).toHaveCount(0)
  await expect(page.getByText('Put your G$ to work in your agent stack')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Buy AI credits with G$', exact: true }),
  ).toHaveCount(0)
})

test('keeps the API key security disclosures behind a collapsed disclosure', async ({ page }) => {
  await expect(page.getByText('Your API key is a secret')).toHaveCount(0)

  await page.getByText('How your API key and spend limit work').click()

  await expect(page.getByText('Your API key is a secret')).toBeVisible()
  await expect(page.getByText('Spend is capped')).toBeVisible()
})

test('keeps the portrait purchase frame inside the viewport without horizontal overflow', async ({
  page,
}) => {
  const purchaseFrame = page.getByTestId('purchase-frame')
  await purchaseFrame.scrollIntoViewIfNeeded()

  const frameBounds = await purchaseFrame.boundingBox()
  const viewport = page.viewportSize()

  expect(frameBounds).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(frameBounds!.x).toBeGreaterThanOrEqual(0)
  expect(frameBounds!.x + frameBounds!.width).toBeLessThanOrEqual(viewport!.width)
  expect(frameBounds!.width).toBeLessThanOrEqual(440)

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
