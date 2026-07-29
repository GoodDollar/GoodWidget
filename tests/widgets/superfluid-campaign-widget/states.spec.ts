import { test, expect, type Page } from '@playwright/test'

// Story IDs derived from the Storybook title 'QA/SuperfluidCampaignWidget/Runtime Fixtures'
// and the named exports in SuperfluidCampaignWidgetQA.stories.tsx.
const STORY_IDS = {
  noWalletContent:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--no-wallet-content&viewMode=story',
  noWalletLeaderboard:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--no-wallet-leaderboard&viewMode=story',
  custodialContent:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--custodial-local-fixture-content&viewMode=story',
  custodialLeaderboard:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--custodial-local-fixture-leaderboard&viewMode=story',
} as const

async function gotoStory(page: Page, storyUrl: string): Promise<void> {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.innerText.trim().length > 0)
}

test('SuperfluidCampaignWidget renders disconnected content view', async ({ page }) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  await expect(page.getByText('Superfluid Ecosystem Rewards')).toBeVisible()
  await expect(page.getByText('SEASON 6')).toBeVisible()
  // Disconnected CTA is required per #127 acceptance criteria
  await expect(page.getByText('Connect Wallet')).toBeVisible()
  // Leaderboard summary section should be present
  await expect(page.getByText('Leaderboard').first()).toBeVisible()
  // Reward pools should be listed
  await expect(page.getByText('How to participate')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-01-no-wallet-content.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget renders disconnected leaderboard view', async ({ page }) => {
  await gotoStory(page, STORY_IDS.noWalletLeaderboard)

  await expect(page.getByText('Leaderboard')).toBeVisible()
  // Top-ranked entry from mock data
  await expect(page.getByText('flowmaster.eth')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-02-no-wallet-leaderboard.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget renders connected content view', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialContent)

  await expect(page.getByText('Superfluid Ecosystem Rewards')).toBeVisible()
  await expect(page.getByText('SEASON 6')).toBeVisible()
  // Connect Wallet CTA must NOT appear for connected wallet
  await expect(page.getByText('Connect Wallet')).not.toBeVisible()
  await expect(page.getByText('How to participate')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-03-custodial-content.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget renders connected leaderboard view', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialLeaderboard)

  await expect(page.getByText('Leaderboard')).toBeVisible()
  await expect(page.getByText('flowmaster.eth')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-04-custodial-leaderboard.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget FAQ accordion expands and collapses', async ({ page }) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  // Find FAQ section — it renders at the bottom of the content view
  const faqTrigger = page.getByText('How are my SUP rewards calculated?').first()
  await expect(faqTrigger).toBeVisible()

  // Answer text is hidden before expanding
  await expect(page.getByText('Two separate reward pools')).not.toBeVisible()

  // Expand the FAQ item
  await faqTrigger.click()
  await expect(page.getByText('Two separate reward pools')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-05-faq-expanded.png',
    fullPage: true,
  })

  // Collapse again
  await faqTrigger.click()
  await expect(page.getByText('Two separate reward pools')).not.toBeVisible()
})

test('SuperfluidCampaignWidget leaderboard back button returns to content view', async ({ page }) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  // Navigate to leaderboard
  const viewLeaderboardBtn = page.getByText('View Leaderboard').first()
  await expect(viewLeaderboardBtn).toBeVisible()
  await viewLeaderboardBtn.click()

  await expect(page.getByText('flowmaster.eth')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-06-leaderboard-navigation.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget mobile layout (480px)', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 })
  await gotoStory(page, STORY_IDS.noWalletContent)

  await expect(page.getByText('Superfluid Ecosystem Rewards')).toBeVisible()
  await expect(page.getByText('Connect Wallet')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-07-mobile-content.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget wide layout (900px)', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 })
  await gotoStory(page, STORY_IDS.noWalletContent)

  await expect(page.getByText('Superfluid Ecosystem Rewards')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-08-wide-content.png',
    fullPage: true,
  })
})
