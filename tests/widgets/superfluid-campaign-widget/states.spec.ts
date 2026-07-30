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
  airdropStatusLoading:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--airdrop-status-loading&viewMode=story',
  airdropStatusRequestFailed:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--airdrop-status-request-failed&viewMode=story',
  airdropStatusNotWhitelisted:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--airdrop-status-not-whitelisted&viewMode=story',
  airdropStatusEligible:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--airdrop-status-eligible&viewMode=story',
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

test('SuperfluidCampaignWidget FAQ is one collapsible section wrapping per-question toggles', async ({ page }) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  // The individual question is nested inside the outer "FAQ" section and is
  // not part of the page's collapsed reading order until that section opens.
  const faqSectionTrigger = page.getByText('FAQ', { exact: true }).first()
  await expect(faqSectionTrigger).toBeVisible()
  const questionTrigger = page.getByText('How are my SUP rewards calculated?').first()
  await expect(questionTrigger).not.toBeVisible()

  // Expand the outer FAQ section — individual questions become visible, still collapsed.
  await faqSectionTrigger.click()
  await expect(questionTrigger).toBeVisible()
  await expect(page.getByText('Two separate reward pools')).not.toBeVisible()

  // Expand one question independently of the others.
  await questionTrigger.click()
  await expect(page.getByText('Two separate reward pools')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-05-faq-expanded.png',
    fullPage: true,
  })

  // Collapse the question again; the outer section stays open.
  await questionTrigger.click()
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

test('SuperfluidCampaignWidget Claim SUP rewards CTA opens claim.superfluid.org in a new tab', async ({ page, context }) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  const claimButton = page.getByText('Claim SUP rewards').first()
  await expect(claimButton).toBeVisible()

  const [newPage] = await Promise.all([context.waitForEvent('page'), claimButton.click()])
  await newPage.waitForLoadState('domcontentloaded').catch(() => {})
  expect(newPage.url()).toContain('claim.superfluid.org')
  await newPage.close()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-09-claim-cta.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget airdrop status: loading', async ({ page }) => {
  await gotoStory(page, STORY_IDS.airdropStatusLoading)

  await expect(page.getByText('Airdrop status', { exact: true })).toBeVisible()
  await expect(page.getByText('Checking your Superfluid airdrop status...')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-10-airdrop-status-loading.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget airdrop status: request failed', async ({ page }) => {
  await gotoStory(page, STORY_IDS.airdropStatusRequestFailed)

  await expect(page.getByText('Airdrop status', { exact: true })).toBeVisible()
  await expect(page.getByText('Airdrop status request failed (500)')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-11-airdrop-status-request-failed.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget airdrop status: not whitelisted', async ({ page }) => {
  await gotoStory(page, STORY_IDS.airdropStatusNotWhitelisted)

  await expect(page.getByText('Not yet whitelisted for the SUP airdrop.')).toBeVisible()
  await expect(page.getByText('Claims: 0')).toBeVisible()
  await expect(page.getByText('Invites: 1000')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-12-airdrop-status-not-whitelisted.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget airdrop status: eligible', async ({ page }) => {
  await gotoStory(page, STORY_IDS.airdropStatusEligible)

  await expect(page.getByText('Eligible for the SUP airdrop.')).toBeVisible()
  await expect(page.getByText('Claims: 3')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-13-airdrop-status-eligible.png',
    fullPage: true,
  })
})
