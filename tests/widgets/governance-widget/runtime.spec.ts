import { expect, test, type Page } from '@playwright/test'

type RuntimeStoryCase = {
  id: string
  testId: string
  expectedText: string
  screenshot: string
  mockInjected?: boolean
}

const RUNTIME_STORIES: RuntimeStoryCase[] = [
  {
    id: 'qa-governancewidget-runtime-fixtures--disconnected-dashboard',
    testId: 'GovernanceWidget-disconnected',
    expectedText: 'Connect Wallet',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-01-disconnected-dashboard.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--loading-connected',
    testId: 'GovernanceWidget-loading',
    expectedText: 'Loading wallet, identity, membership, and governance data…',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-02-loading-connected.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--onboarding-required-hoa-unavailable',
    testId: 'GovernanceWidget-onboarding',
    expectedText: 'House of Alignment',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-03-onboarding-hoa-unavailable.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--pending-alignment',
    testId: 'GovernanceWidget-pending-alignment',
    expectedText: 'Alignment membership pending',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-04-pending-alignment.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--active-citizenship',
    testId: 'GovernanceWidget-active_citizenship',
    expectedText: 'House of Citizenship',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-05-active-citizenship.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--active-alignment-injected',
    testId: 'GovernanceWidget-active_alignment',
    expectedText: 'House of Alignment',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-06-active-alignment-injected.png',
    mockInjected: true,
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--vote-detail-open',
    testId: 'GovernanceWidget-vote-detail',
    expectedText: 'Allocation total: 10000 / 10,000 bps',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-07-vote-detail-open.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--already-voted',
    testId: 'GovernanceWidget-already-voted',
    expectedText: 'Ballot updates are not available',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-08-already-voted.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--vote-closed-executed',
    testId: 'GovernanceWidget-active-governance',
    expectedText: 'Final units executed',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-09-vote-closed-executed.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--empty-recipients',
    testId: 'GovernanceWidget-active-governance',
    expectedText: 'No House of Alignment members have been assigned yet',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-10-empty-recipients.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--pool-unavailable-mocked',
    testId: 'GovernanceWidget-funding-distribution',
    expectedText: 'No active funding distribution yet.',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-11-pool-unavailable-mocked.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--unsupported-chain',
    testId: 'GovernanceWidget-unsupported-chain',
    expectedText: 'Switch to Celo Mainnet',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-12-unsupported-chain.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--restake-required',
    testId: 'GovernanceWidget-restake',
    expectedText: 'Restore governance membership',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-13-restake-required.png',
  },
  {
    id: 'qa-governancewidget-runtime-fixtures--friendly-contract-error',
    testId: 'GovernanceWidget-friendly-error',
    expectedText: 'Governance data unavailable',
    screenshot: 'tests/widgets/governance-widget/test-results/gwr-14-friendly-contract-error.png',
  },
]

async function installInjectedProvider(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.ethereum = {
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return ['0x4E5B2D7a45C2e31a8F0d09b4bE1fA11aD3aC9F08']
        }
        if (method === 'eth_chainId') return '0xa4ec'
        if (method === 'wallet_switchEthereumChain') return null
        return null
      },
      on: () => {},
      removeListener: () => {},
    }
  })
}

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
  await page.waitForLoadState('networkidle')
}

for (const storyCase of RUNTIME_STORIES) {
  test(`${storyCase.id} renders runtime state`, async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 900 })
    if (storyCase.mockInjected) {
      await installInjectedProvider(page)
    }

    await gotoStory(page, storyCase.id)

    await expect(page.getByTestId(storyCase.testId).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(storyCase.expectedText).first()).toBeVisible()
    await page.screenshot({ path: storyCase.screenshot, fullPage: true })
  })
}

test('onboarding runtime fixture greys out House of Alignment for non-whitelisted wallets', async ({
  page,
}) => {
  await gotoStory(page, 'qa-governancewidget-runtime-fixtures--onboarding-required-hoa-unavailable')

  const alignmentCard = page.getByTestId('GovernanceOnboardingWidget-house-alignment')
  await expect(alignmentCard).toBeVisible()
  await expect(alignmentCard).toHaveCSS('pointer-events', 'none')
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwr-15-hoa-greyed-out.png',
    fullPage: true,
  })
})
