import { expect, test } from '@playwright/test'

const heroHeading = 'Get up to 20% more AI credits with GoodID'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('renders the hero, purchase widget, and security section without an injected wallet', async ({
  page,
}) => {
  await expect(page.getByRole('heading', { level: 1, name: heroHeading })).toBeVisible()
  await expect(page.getByTestId('wallet-fallback')).toBeVisible()
  await expect(page.getByText('Know what runs, who can see it, and what is at risk')).toBeVisible()

  const apiDocsLink = page.getByRole('link', {
    name: 'Read the Antseed API docs',
    exact: true,
  })
  await expect(apiDocsLink).toHaveAttribute(
    'href',
    'https://antseed.com/docs/guides/using-the-api/',
  )
  await expect(apiDocsLink).toHaveAttribute('target', '_blank')
  await expect(apiDocsLink).toHaveAttribute('rel', /noopener/)
  await expect(apiDocsLink).toHaveAttribute('rel', /noreferrer/)
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

test('keeps the security disclosures that have no widget equivalent', async ({ page }) => {
  // The section heading stays on the page; the detail sits behind a collapsed
  // disclosure, so it has to be expanded before any of it is visible.
  await expect(page.getByText('Know what runs, who can see it, and what is at risk')).toBeVisible()
  await expect(page.getByText('Separated identity')).toHaveCount(0)

  await page.getByText('How routing, identity, and the operator role work').click()

  await expect(page.getByText('GoodDollar operator role on Base')).toBeVisible()
  await expect(page.getByText('Local, explicit routing')).toBeVisible()
  await expect(page.getByText('Separated identity')).toBeVisible()

  const securityDocsLink = page.getByRole('link', {
    name: 'Read the Antseed security documentation',
    exact: true,
  })
  await expect(securityDocsLink).toHaveAttribute('href', 'https://antseed.com/docs/security/')
  await expect(securityDocsLink).toHaveAttribute('target', '_blank')
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
