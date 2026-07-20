import { expect, test } from '@playwright/test'

const purchaseLabel = 'Buy AI credits with G$'
const heroHeading = 'Get up to 20% more AI credits with GoodID'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('renders the full developer landing page without an injected wallet', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: heroHeading })).toBeVisible()
  await expect(page.getByTestId('wallet-fallback')).toBeVisible()
  await expect(page.getByText('How your AI credits work')).toBeVisible()
  await expect(page.getByTestId('benefits-strip').getByText('20% more AI credits')).toBeVisible()
  await expect(page.getByText('Connect your local agent workflow')).toBeVisible()
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

test('distinguishes settlement chains and shows current Antseed commands', async ({ page }) => {
  await expect(
    page.getByText('Fund the purchase with G$ on Celo Mainnet, chain ID 42220.'),
  ).toBeVisible()
  await expect(
    page.getByText('Credits settle and are used through Antseed on Base Mainnet, chain ID 8453.'),
  ).toBeVisible()

  const sharedSetup = page.getByTestId('shared-setup-commands')
  await expect(sharedSetup).toContainText('npm install -g @antseed/cli')
  await expect(sharedSetup).toContainText('export ANTSEED_IDENTITY_HEX=<buyer-private-key-hex>')
  await expect(sharedSetup).toContainText('antseed buyer start')
  await expect(sharedSetup).toContainText('antseed network browse')
  await expect(sharedSetup).toContainText('antseed buyer connection set --peer <peer-id>')
  await expect(page.getByText('antseed claude --model <service-id>')).toBeVisible()
  await expect(page.getByText('antseed codex --model <service-id>')).toBeVisible()
  await expect(page.getByText('http://localhost:8377/v1/messages')).toBeVisible()
  await expect(page.getByText('http://localhost:8377/v1/chat/completions')).toBeVisible()
  await expect(page.getByText('http://localhost:8377/v1/responses')).toBeVisible()

  const agentSkills = page.getByTestId('agent-skills')
  await expect(agentSkills).toContainText('pi install git:github.com/AntSeed/pi-antseed')
  await expect(agentSkills.getByRole('link', { name: 'Pi setup skill' })).toHaveAttribute(
    'href',
    'https://github.com/AntSeed/pi-antseed',
  )
  await expect(agentSkills.getByRole('link', { name: 'Claude Code setup skill' })).toHaveAttribute(
    'href',
    'https://github.com/AntSeed/antseed/tree/main/skills/join-buyer',
  )
  await expect(agentSkills.getByRole('link', { name: 'OpenClaw setup skill' })).toHaveAttribute(
    'href',
    'https://github.com/AntSeed/antseed/tree/main/skills/openclaw-antseed',
  )
})

test('both purchase CTAs scroll to the purchase section', async ({ page }) => {
  const purchaseSection = page.locator('#purchase')
  const purchaseButtons = page.getByRole('button', { name: purchaseLabel, exact: true })

  await expect(purchaseButtons).toHaveCount(2)

  await purchaseButtons.nth(0).click()
  await expect
    .poll(() =>
      purchaseSection.evaluate((element) => Math.abs(element.getBoundingClientRect().top)),
    )
    .toBeLessThan(32)

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await purchaseButtons.nth(1).scrollIntoViewIfNeeded()
  await purchaseButtons.nth(1).click()
  await expect
    .poll(() =>
      purchaseSection.evaluate((element) => Math.abs(element.getBoundingClientRect().top)),
    )
    .toBeLessThan(32)
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
