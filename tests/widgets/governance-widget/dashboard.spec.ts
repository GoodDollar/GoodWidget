/**
 * states.spec.ts — Playwright smoke tests for presentational governance widgets.
 *
 * The stories use mocked values only; these tests verify screenshot-ready light,
 * dark, mobile, long-content, empty, and interaction states without wallet or RPC.
 */
import { test, expect, Page } from '@playwright/test'

type GovernanceStoryCase = {
  id: string
  testId: string
  screenshot: string
  width?: number
  height?: number
  expectedText: string
  expectedBackgroundColor?: string
}

const STORY_CASES: GovernanceStoryCase[] = [
  {
    id: 'widgets-governancewidget--impact-light',
    testId: 'ImpactCard-light',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-01-impact-light.png',
    width: 390,
    height: 844,
    expectedText: 'View Impact Report Q3',
  },
  {
    id: 'widgets-governancewidget--impact-dark-long-disabled-mobile',
    testId: 'ImpactCard-dark-mobile-disabled',
    screenshot:
      'tests/widgets/governance-widget/test-results/gw-02-impact-dark-mobile-disabled.png',
    width: 390,
    height: 844,
    expectedText: 'View Impact Report Q3',
  },
  {
    id: 'widgets-governancewidget--impact-light-component-override',
    testId: 'ImpactCard-light-component-override',
    screenshot:
      'tests/widgets/governance-widget/test-results/gw-13-impact-light-component-override.png',
    width: 390,
    height: 844,
    expectedText: 'View Impact Report Q3',
    expectedBackgroundColor: 'rgb(15, 118, 110)',
  },
  {
    id: 'widgets-governancewidget--balance-variants-light',
    testId: 'BalanceCard-light-variants',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-03-balance-variants-light.png',
    expectedText: 'DAO Treasury Balance',
  },
  {
    id: 'widgets-governancewidget--balance-dark-compact',
    testId: 'BalanceCard-dark-compact',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-04-balance-dark-compact.png',
    width: 390,
    height: 844,
    expectedText: 'Snapshot in 3 days',
  },
  {
    id: 'widgets-governancewidget--alignment-default-light',
    testId: 'AlignmentVotingProposalCard-default',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-05-alignment-default-light.png',
    expectedText: 'Current top 3 voted',
  },
  {
    id: 'widgets-governancewidget--alignment-dark-long-options',
    testId: 'AlignmentVotingProposalCard-dark-long',
    screenshot:
      'tests/widgets/governance-widget/test-results/gw-06-alignment-dark-long-options.png',
    expectedText: '+2 more options',
  },
  {
    id: 'widgets-governancewidget--optimistic-high-quorum-light',
    testId: 'OptimisticVotingProposalCard-high-quorum',
    screenshot:
      'tests/widgets/governance-widget/test-results/gw-07-optimistic-high-quorum-light.png',
    expectedText: '2 days remaining',
  },
  {
    id: 'widgets-governancewidget--optimistic-dark-low-quorum-mixed',
    testId: 'OptimisticVotingProposalCard-low-quorum',
    screenshot:
      'tests/widgets/governance-widget/test-results/gw-08-optimistic-dark-low-quorum-mixed.png',
    expectedText: '+84',
  },
  {
    id: 'widgets-governancewidget--funding-distribution-light',
    testId: 'FundingDistributionChart-populated',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-09-funding-distribution-light.png',
    width: 390,
    height: 844,
    expectedText: 'Education Hubs',
  },
  {
    id: 'widgets-governancewidget--funding-distribution-dark-populated',
    testId: 'FundingDistributionChart-populated-dark',
    screenshot:
      'tests/widgets/governance-widget/test-results/gw-10-funding-distribution-dark-populated.png',
    width: 390,
    height: 844,
    expectedText: 'Education Hubs',
  },
  {
    id: 'widgets-governancewidget--funding-distribution-dark-empty-mobile',
    testId: 'FundingDistributionChart-empty-dark-mobile',
    screenshot:
      'tests/widgets/governance-widget/test-results/gw-11-funding-distribution-empty-dark-mobile.png',
    width: 390,
    height: 844,
    expectedText: 'No active funding distribution yet.',
  },
]

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await page.waitForLoadState('domcontentloaded')
  await page.locator('#storybook-root').waitFor({ state: 'attached' })
  await page.waitForLoadState('networkidle')
}

for (const storyCase of STORY_CASES) {
  test(`${storyCase.id} renders and captures screenshot`, async ({ page }) => {
    if (storyCase.width && storyCase.height) {
      await page.setViewportSize({ width: storyCase.width, height: storyCase.height })
    }

    await gotoStory(page, storyCase.id)

    const component = page.getByTestId(storyCase.testId)
    await expect(component).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(storyCase.expectedText).first()).toBeVisible()
    if (storyCase.expectedBackgroundColor) {
      await expect(component).toHaveCSS('background-color', storyCase.expectedBackgroundColor)
    }

    await component.screenshot({ path: storyCase.screenshot })
  })
}

test('governance card interactions update mocked action state', async ({ page }) => {
  await gotoStory(page, 'widgets-governancewidget--alignment-default-light')

  await page.getByTestId('AlignmentVotingProposalCard-default').click()
  await expect(page.getByTestId('GovernanceWidget-last-action')).toContainText(
    'Opened alignment-q3',
  )

  await page.getByTestId('AlignmentVotingProposalCard-default').screenshot({
    path: 'tests/widgets/governance-widget/test-results/gw-12-interaction-alignment.png',
  })
})
