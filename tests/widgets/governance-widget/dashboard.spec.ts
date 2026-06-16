import { expect, test, type Page } from '@playwright/test'

type GovernanceStoryCase = {
  id: string
  testId: string
  screenshot: string
  width?: number
  height?: number
  expectedText: string
}

const STORY_CASES: GovernanceStoryCase[] = [
  {
    id: 'widgets-governancedashboard--impact-light',
    testId: 'ImpactCard-light',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-01-impact-light.png',
    expectedText: 'Community impact this month',
  },
  {
    id: 'widgets-governancedashboard--impact-dark-long-disabled-mobile',
    testId: 'ImpactCard-dark-mobile-disabled',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-02-impact-dark-mobile-disabled.png',
    width: 390,
    height: 844,
    expectedText: 'Coming soon',
  },
  {
    id: 'widgets-governancedashboard--balance-variants-light',
    testId: 'BalanceCard-token-growth',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-03-balance-variants-light.png',
    expectedText: 'Voting balance',
  },
  {
    id: 'widgets-governancedashboard--balance-dark-compact',
    testId: 'BalanceCard-dark-compact',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-04-balance-dark-compact.png',
    width: 390,
    height: 844,
    expectedText: 'Snapshot in 3 days',
  },
  {
    id: 'widgets-governancedashboard--alignment-default-light',
    testId: 'AlignmentVotingProposalCard-default',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-05-alignment-default-light.png',
    expectedText: 'Current top 3 voted',
  },
  {
    id: 'widgets-governancedashboard--alignment-dark-long-options',
    testId: 'AlignmentVotingProposalCard-dark-long',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-06-alignment-dark-long-options.png',
    expectedText: '+2 more options',
  },
  {
    id: 'widgets-governancedashboard--optimistic-high-quorum-light',
    testId: 'OptimisticVotingProposalCard-high-quorum',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-07-optimistic-high-quorum-light.png',
    expectedText: '78% reached',
  },
  {
    id: 'widgets-governancedashboard--optimistic-dark-low-quorum-mixed',
    testId: 'OptimisticVotingProposalCard-low-quorum',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-08-optimistic-dark-low-quorum-mixed.png',
    expectedText: '+84',
  },
  {
    id: 'widgets-governancedashboard--funding-distribution-light',
    testId: 'FundingDistributionChart-populated',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-09-funding-distribution-light.png',
    width: 760,
    height: 720,
    expectedText: 'Local Food Chain',
  },
  {
    id: 'widgets-governancedashboard--funding-distribution-dark-empty-mobile',
    testId: 'FundingDistributionChart-empty-dark-mobile',
    screenshot: 'tests/widgets/governance-widget/test-results/gw-10-funding-distribution-empty-dark-mobile.png',
    width: 390,
    height: 844,
    expectedText: 'No active funding distribution yet.',
  },
]

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await page.waitForLoadState('domcontentloaded')
}

for (const storyCase of STORY_CASES) {
  test(`${storyCase.id} renders and captures screenshot`, async ({ page }) => {
    if (storyCase.width && storyCase.height) {
      await page.setViewportSize({ width: storyCase.width, height: storyCase.height })
    }

    await gotoStory(page, storyCase.id)

    const component = page.getByTestId(storyCase.testId)
    await expect(component).toBeVisible()
    await expect(page.getByText(storyCase.expectedText).first()).toBeVisible()

    await page.screenshot({ path: storyCase.screenshot, fullPage: true })
  })
}

test('governance dashboard card interactions update mocked action state', async ({ page }) => {
  await gotoStory(page, 'widgets-governancedashboard--alignment-default-light')

  await page.getByTestId('AlignmentVotingProposalCard-default').click()
  await expect(page.getByTestId('GovernanceWidget-last-action')).toContainText(
    'Opened alignment-q3',
  )

  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gw-11-interaction-alignment.png',
    fullPage: true,
  })
})
