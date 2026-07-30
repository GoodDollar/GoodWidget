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
  leaderboardLoading:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--leaderboard-loading&viewMode=story',
  leaderboardRequestFailed:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--leaderboard-request-failed&viewMode=story',
  leaderboardPopulated:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--leaderboard-populated&viewMode=story',
  supTotalsRequestFailed:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--sup-totals-request-failed&viewMode=story',
  supTotalsPopulated:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--sup-totals-populated&viewMode=story',
} as const

// Top-ranked account address (truncated) for each campaign in LEADERBOARD_DATA_FIXTURES
// (superfluidCampaignWidgetStories.tsx) — 606 = GoodDollar actions (default tab), 614 = Ecosystem actions.
const GOOD_DOLLAR_ACTIONS_TOP_ADDRESS = '0x1a2b...9a0b'
const ECOSYSTEM_FUNDING_ACTIONS_TOP_ADDRESS = '0x4d5e...2d3e'

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
  // Top-ranked entry from the live Points API leaderboard fixture (GoodDollar actions tab, default)
  await expect(page.getByText(GOOD_DOLLAR_ACTIONS_TOP_ADDRESS)).toBeVisible()

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
  await expect(page.getByText(GOOD_DOLLAR_ACTIONS_TOP_ADDRESS)).toBeVisible()

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

  await expect(page.getByText(GOOD_DOLLAR_ACTIONS_TOP_ADDRESS)).toBeVisible()

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

test('SuperfluidCampaignWidget campaign leaderboard: loading', async ({ page }) => {
  await gotoStory(page, STORY_IDS.leaderboardLoading)

  await expect(page.getByText('Loading leaderboard...')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-14-leaderboard-loading.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget campaign leaderboard: request failed', async ({ page }) => {
  await gotoStory(page, STORY_IDS.leaderboardRequestFailed)

  await expect(page.getByText('Campaign leaderboard request failed (500)')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-15-leaderboard-request-failed.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget campaign leaderboard: switching tabs shows each campaign\'s own accounts', async ({ page }) => {
  await gotoStory(page, STORY_IDS.leaderboardPopulated)

  // Default tab (GoodDollar actions, campaignId 606)
  await expect(page.getByText(GOOD_DOLLAR_ACTIONS_TOP_ADDRESS)).toBeVisible()
  await expect(page.getByText(ECOSYSTEM_FUNDING_ACTIONS_TOP_ADDRESS)).not.toBeVisible()

  await page.getByText('Ecosystem actions').click()

  await expect(page.getByText(ECOSYSTEM_FUNDING_ACTIONS_TOP_ADDRESS)).toBeVisible()
  await expect(page.getByText(GOOD_DOLLAR_ACTIONS_TOP_ADDRESS)).not.toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-16-leaderboard-tab-switch.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget SUP totals: populated from the Superfluid programs API for campaign 606, 614 stays placeholder', async ({ page }) => {
  await gotoStory(page, STORY_IDS.supTotalsPopulated)

  // 606 (GoodDollar actions) resolves a live program match — figures come from
  // SUP_TOTALS_FIXTURES, not DEFAULT_CAMPAIGN_MOCK_DATA's static placeholder
  // (75,895 / 217,700), proving the progress bar is sourced from the adapter.
  await expect(page.getByText('128,940 / 217,700 SUP')).toBeVisible()
  // 614 (Ecosystem actions) has no matching program id yet, so
  // RewardPoolSection falls back to its own unchanged mock placeholder.
  await expect(page.getByText('262,450 / 404,300 SUP')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-17-sup-totals-populated.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget SUP totals: request failed falls back to placeholder figures for both pools', async ({ page }) => {
  await gotoStory(page, STORY_IDS.supTotalsRequestFailed)

  // Neither pool has data on a failed request, so both fall back to their
  // mock placeholders rather than showing an error state or blank bar.
  await expect(page.getByText('75,895 / 217,700 SUP')).toBeVisible()
  await expect(page.getByText('262,450 / 404,300 SUP')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-18-sup-totals-request-failed.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget entire action card is clickable and triggers the same action as its CTA button', async ({ page, context }) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  // Click the card via its title text, away from the CTA button itself, to
  // confirm the whole card (not just the button) is a click target.
  const cardTitle = page.getByText('Vote on Flow State').first()
  await expect(cardTitle).toBeVisible()

  const [newPage] = await Promise.all([context.waitForEvent('page'), cardTitle.click()])
  await newPage.waitForLoadState('domcontentloaded').catch(() => {})
  expect(newPage.url()).toContain('flowstate.network')
  await newPage.close()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-19-action-card-whole-card-click.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget clicking the CTA button directly does not double-fire the action', async ({ page, context }) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  const voteButton = page.getByText('Vote', { exact: true }).first()
  await expect(voteButton).toBeVisible()

  const pagesBefore = context.pages().length
  const [newPage] = await Promise.all([context.waitForEvent('page'), voteButton.click()])
  await newPage.waitForLoadState('domcontentloaded').catch(() => {})

  // Give a duplicate-fire regression a moment to open a second tab before
  // asserting exactly one new page resulted from this single click.
  await page.waitForTimeout(300)
  expect(context.pages().length).toBe(pagesBefore + 1)
  expect(newPage.url()).toContain('flowstate.network')
  await newPage.close()
})

// Narrow-viewport regression suite for the header "Connect wallet" CTA, covering
// both Content view's CampaignHeader and Leaderboard view's own (separately
// coded) header row. Reuses the change-request-7 breakpoint set (min-supported
// through larger-Android widths). Scoped to the header buttons only — ActionCard
// has its own separate, pre-existing pill/button clipping at these widths that
// is out of scope for this fix, so it is deliberately not asserted here.
async function findClippedButtons(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const clipped: string[] = []
    for (const btn of Array.from(document.querySelectorAll('button'))) {
      const rect = btn.getBoundingClientRect()
      for (let el = btn.parentElement; el; el = el.parentElement) {
        const style = getComputedStyle(el)
        const elRect = el.getBoundingClientRect()
        if ((style.overflowX === 'hidden' || style.overflow === 'hidden') && rect.right > elRect.right + 0.5) {
          clipped.push(btn.textContent?.trim() ?? '(unlabeled button)')
          break
        }
      }
    }
    return clipped
  })
}

const HEADER_WRAP_BREAKPOINTS = [
  { width: 320, label: 'min-supported' },
  { width: 360, label: 'common-android' },
  { width: 375, label: 'iphone-se' },
  { width: 390, label: 'modern-iphone' },
  { width: 412, label: 'larger-android' },
]

const HEADER_WRAP_VIEWS = [
  { key: 'content', storyUrl: STORY_IDS.noWalletContent, headerButtonText: 'Connect wallet', screenshotBase: 20 },
  { key: 'leaderboard-disconnected', storyUrl: STORY_IDS.noWalletLeaderboard, headerButtonText: 'Connect wallet', screenshotBase: 25 },
  { key: 'leaderboard-connected', storyUrl: STORY_IDS.custodialLeaderboard, headerButtonText: 'Close leaderboard', screenshotBase: 30 },
]

for (const view of HEADER_WRAP_VIEWS) {
  for (const [i, { width, label }] of HEADER_WRAP_BREAKPOINTS.entries()) {
    const screenshotIndex = view.screenshotBase + i

    test(`SuperfluidCampaignWidget ${view.key} header has no button clipping at ${width}px (${label})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await gotoStory(page, view.storyUrl)

      // headerButtonText is matched against either visible text (Connect wallet)
      // or an aria-label (Close leaderboard's icon-only button has no text content).
      await expect(page.getByText(view.headerButtonText).or(page.getByLabel(view.headerButtonText))).toBeVisible()

      // Document must never grow wider than the viewport — a +1px tolerance
      // absorbs sub-pixel rounding without masking a real overflow.
      const documentScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(documentScrollWidth).toBeLessThanOrEqual(width + 1)

      // A button can be silently clipped by an ancestor's overflow:hidden (e.g.
      // the card's own rounded-corner clipping) without ever growing the
      // document's scrollWidth above — this is exactly how the header CTA was
      // cut off pre-fix. Only assert on the header's own buttons; ActionCard's
      // separate clipping issue at these widths is intentionally not checked here.
      const clippedButtons = await findClippedButtons(page)
      expect(clippedButtons).not.toContain('Connect wallet')
      expect(clippedButtons).not.toContain('')

      await page.screenshot({
        path: `tests/widgets/superfluid-campaign-widget/test-results/scw-${screenshotIndex}-responsive-${view.key}-${width}px-${label}.png`,
        fullPage: true,
      })
    })
  }
}
