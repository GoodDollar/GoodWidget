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
  leaderboardLoading:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--leaderboard-loading&viewMode=story',
  leaderboardRequestFailed:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--leaderboard-request-failed&viewMode=story',
  leaderboardPopulated:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--leaderboard-populated&viewMode=story',
  leaderboardEmpty:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--leaderboard-empty&viewMode=story',
  leaderboardApiContract:
    '/iframe.html?id=widgets-superfluidcampaignwidget-api-contracts--leaderboard-api-contract&viewMode=story',
  supTotalsRequestFailed:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--sup-totals-request-failed&viewMode=story',
  supTotalsLoading:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--sup-totals-loading&viewMode=story',
  supTotalsNoProgram:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--sup-totals-no-program&viewMode=story',
  supTotalsPopulated:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--sup-totals-populated&viewMode=story',
  supTotalsProgramsApiContract:
    '/iframe.html?id=widgets-superfluidcampaignwidget-api-contracts--sup-totals-programs-api-contract&viewMode=story',
} as const

// Top-ranked account address (truncated) for each campaign in LEADERBOARD_DATA_FIXTURES
// (superfluidCampaignWidgetStories.tsx) — 606 = GoodDollar actions (default tab), 614 = Ecosystem actions.
const GOOD_DOLLAR_ACTIONS_TOP_ADDRESS = '0x1a2b...9a0b'
const ECOSYSTEM_FUNDING_ACTIONS_TOP_ADDRESS = '0x4d5e...2d3e'

async function waitForStoryReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.innerText.trim().length > 0)
}

async function gotoStory(page: Page, storyUrl: string): Promise<void> {
  await page.goto(storyUrl)
  await waitForStoryReady(page)
}

test('SuperfluidCampaignWidget QA runtime makes no production data requests', async ({ page }) => {
  const productionRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (
      url.startsWith('https://claim.superfluid.org/api/programs') ||
      url.startsWith('https://cms.superfluid.pro/points')
    ) {
      productionRequests.push(url)
    }
  })

  await gotoStory(page, STORY_IDS.custodialLeaderboard)
  await expect(page.getByText(GOOD_DOLLAR_ACTIONS_TOP_ADDRESS)).toBeVisible()
  expect(productionRequests).toEqual([])
})

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
  // Activity completion is derived from Points API events and must remain
  // visible for public leaderboard rows.
  await expect(page.getByLabel('Claim UBI: done').first()).toBeVisible()
  await expect(page.getByLabel('Successful invite: done').first()).toBeVisible()
  await expect(page.getByText('Rank', { exact: true })).toBeVisible()
  await expect(page.getByText('Address', { exact: true })).toBeVisible()
  await expect(page.getByText('Points', { exact: true })).toBeVisible()
  await expect(page.getByText('Actions', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Gardens one-time donation: not done')).not.toBeVisible()

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
  // Header's top-right slot must show the truncated-address wallet chip
  // (0x1a2b...9a0b form), not the old decorative placeholder box.
  await expect(page.getByText(/^0x[0-9a-fA-F]{4}\.\.\.[0-9a-fA-F]{4}$/)).toBeVisible()
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
  await expect(page.getByText('Airdrop status', { exact: true })).not.toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-04-custodial-leaderboard.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget FAQ is one collapsible section wrapping per-question toggles', async ({
  page,
}) => {
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

test('SuperfluidCampaignWidget leaderboard back button returns to content view', async ({
  page,
}) => {
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

test('SuperfluidCampaignWidget mobile leaderboard keeps its headers and scrolls horizontally', async ({
  page,
}) => {
  await page.setViewportSize({ width: 480, height: 900 })
  await gotoStory(page, STORY_IDS.noWalletLeaderboard)

  await expect(page.getByText('Rank', { exact: true })).toBeVisible()
  await expect(page.getByText('Address', { exact: true })).toBeVisible()
  await expect(page.getByText('Points', { exact: true })).toBeVisible()
  await expect(page.getByText('Actions', { exact: true })).toBeVisible()
  await expect(page.getByTestId('LeaderboardRow-1')).toHaveCSS('flex-direction', 'row')
  await expect(page.getByTestId('LeaderboardRow-1')).toHaveCSS('min-width', '480px')

  const scrollMetrics = await page.getByTestId('Leaderboard-table-scroll').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(scrollMetrics.scrollWidth).toBeGreaterThan(scrollMetrics.clientWidth)
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

test('SuperfluidCampaignWidget Claim SUP rewards CTA opens claim.superfluid.org in a new tab', async ({
  page,
  context,
}) => {
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

test('SuperfluidCampaignWidget campaign leaderboard: empty', async ({ page }) => {
  await gotoStory(page, STORY_IDS.leaderboardEmpty)

  await expect(page.getByText('Total participants: 0')).toBeVisible()
  await expect(page.getByText(GOOD_DOLLAR_ACTIONS_TOP_ADDRESS)).not.toBeVisible()
})

test("SuperfluidCampaignWidget campaign leaderboard: switching tabs shows each campaign's own accounts", async ({
  page,
}) => {
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

test('SuperfluidCampaignWidget leaderboard addresses link to the Base Superfluid Explorer', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.noWalletLeaderboard)

  await expect(page.getByRole('link', { name: GOOD_DOLLAR_ACTIONS_TOP_ADDRESS })).toHaveAttribute(
    'href',
    'https://explorer.superfluid.org/base-mainnet/accounts/0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  )
})

test('SuperfluidCampaignWidget leaderboard only shows actions for the selected campaign', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.leaderboardPopulated)

  await expect(page.getByLabel('Claim UBI: done').first()).toBeVisible()
  await expect(page.getByLabel('Gardens funding stream: not done')).not.toBeVisible()

  await page.getByText('Ecosystem actions').click()

  await expect(page.getByLabel('Gardens funding stream: done').first()).toBeVisible()
  await expect(page.getByLabel('Claim UBI: not done')).not.toBeVisible()
})

test('SuperfluidCampaignWidget enriches a leaderboard page from per-account point events', async ({
  page,
}) => {
  const account = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

  await page.route('**/points/campaign?*', async (route) => {
    await route.fulfill({
      json: {
        campaignId: 606,
        name: 'GoodDollar Actions',
        slug: 'good-dollar-actions',
        totalPoints: 12,
        memberCount: 1,
        totalEvents: 3,
        lastEventAt: '2026-07-31T00:00:00.000Z',
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    })
  })
  await page.route('**/points/accounts?*', async (route) => {
    await route.fulfill({
      json: {
        accounts: [
          {
            account,
            totalPoints: 12,
            eventCount: 3,
            lastEventAt: '2026-07-31T00:00:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          totalDocs: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    })
  })
  await page.route('**/points/events?*', async (route) => {
    expect(new URL(route.request().url()).searchParams.get('account')).toBe(account)
    await route.fulfill({
      json: {
        events: [
          { eventName: 'claimed', points: 1 },
          { eventName: 'validInvites', points: -10 },
          { eventName: 'flowStateVoted', points: 0 },
        ],
        pagination: {
          page: 1,
          limit: 100,
          totalDocs: 3,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    })
  })

  await gotoStory(page, STORY_IDS.leaderboardApiContract)

  await expect(page.getByLabel('Claim UBI: done')).toBeVisible()
  await expect(page.getByLabel('Successful invite: not done')).toBeVisible()
  await expect(page.getByLabel('Flow State vote: not done')).toBeVisible()
})

test('SuperfluidCampaignWidget SUP distribution and members: populated from the mocked programs client for campaign 606', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.supTotalsPopulated)

  // Figures come from the mocked runtime client, proving changing values are
  // separate from the stable campaign definition.
  await expect(page.getByText('128,940 / 217,700 SUP')).toBeVisible()
  // The programs API fixture adapter supplies the member count.
  await expect(page.getByText('712 participants')).toBeVisible()
  // 614 (Ecosystem actions) has no matching program id yet, so
  // RewardPoolSection falls back to its own unchanged mock placeholder.
  await expect(page.getByText('262,450 / 404,300 SUP')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-17-sup-totals-populated.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget SUP totals: request failed renders empty totals for both pools', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.supTotalsRequestFailed)

  // This preserves the existing hook/component behavior: absent totals use zero.
  await expect(page.getByText('0 / 0 SUP')).toHaveCount(2)

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-18-sup-totals-request-failed.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget SUP totals: loading stays deterministic', async ({ page }) => {
  await gotoStory(page, STORY_IDS.supTotalsLoading)
  await expect(page.getByText('0 / 0 SUP')).toHaveCount(2)
})

test('SuperfluidCampaignWidget SUP totals: no program renders empty totals', async ({ page }) => {
  await gotoStory(page, STORY_IDS.supTotalsNoProgram)
  await expect(page.getByText('0 / 0 SUP')).toHaveCount(2)
})

test('SuperfluidCampaignWidget SUP distribution and members sourced from the programs API for campaign 606', async ({
  page,
}) => {
  // Mock the programs API endpoint with a minimal superjson envelope for campaign 606.
  await page.route('https://claim.superfluid.org/api/programs', async (route) => {
    await route.fulfill({
      json: {
        json: [
          {
            program: {
              id: 606,
              onchainInfo: {
                totalAllocated: '50000000000000000000000',
                totalClaimed: '1000000000000000000',
                totalMembers: 42,
              },
            },
          },
        ],
      },
    })
  })

  await gotoStory(page, STORY_IDS.supTotalsProgramsApiContract)

  // 50,000 SUP allocated, 1 SUP claimed — verifies the API response drives the bar.
  await expect(page.getByText('1 / 50,000 SUP')).toBeVisible()
  await expect(page.getByText('42 participants')).toBeVisible()
})

test('SuperfluidCampaignWidget entire action card is clickable and triggers the same action as its CTA button', async ({
  page,
  context,
}) => {
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

test('SuperfluidCampaignWidget clicking the CTA button directly does not double-fire the action', async ({
  page,
  context,
}) => {
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

test('SuperfluidCampaignWidget claim keeps the Superfluid header and can be closed', async ({ page }) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  await page.getByTestId('ActionCard-layout-claim-ubi').getByText('Claim', { exact: true }).click()

  await expect(page.getByText('Superfluid Ecosystem Rewards')).toBeVisible()
  const closeButton = page.getByLabel('Close claim widget')
  await expect(closeButton).toBeVisible()
  await closeButton.click()

  await expect(page.getByTestId('ActionCard-layout-claim-ubi')).toBeVisible()
})

test('SuperfluidCampaignWidget invite opens GoodWallet instead of the Citizen Claim widget', async ({
  page,
  context,
}) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  const inviteCard = page.getByTestId('ActionCard-layout-invite-users')
  const [newPage] = await Promise.all([context.waitForEvent('page'), inviteCard.click()])
  await newPage.waitForLoadState('domcontentloaded').catch(() => {})
  expect(newPage.url()).toContain('goodwallet.xyz/en/gooddollar')
  await newPage.close()
  await expect(page.getByLabel('Close claim widget')).not.toBeVisible()
})

// Narrow-viewport regression suite for the header "Connect wallet" CTA, covering
// both Content view's CampaignHeader and Leaderboard view's own (separately
// coded) header row. Reuses the change-request-7 breakpoint set (min-supported
// through larger-Android widths).
async function findClippedButtons(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const clipped: string[] = []
    for (const btn of Array.from(document.querySelectorAll('button'))) {
      const rect = btn.getBoundingClientRect()
      for (let el = btn.parentElement; el; el = el.parentElement) {
        const style = getComputedStyle(el)
        const elRect = el.getBoundingClientRect()
        if (
          (style.overflowX === 'hidden' || style.overflow === 'hidden') &&
          rect.right > elRect.right + 0.5
        ) {
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
  {
    key: 'content',
    storyUrl: STORY_IDS.noWalletContent,
    headerButtonText: 'Connect wallet',
    screenshotBase: 20,
  },
  {
    key: 'leaderboard-disconnected',
    storyUrl: STORY_IDS.noWalletLeaderboard,
    headerButtonText: 'Connect wallet',
    screenshotBase: 25,
  },
  {
    key: 'leaderboard-connected',
    storyUrl: STORY_IDS.custodialLeaderboard,
    headerButtonText: 'Close leaderboard',
    screenshotBase: 30,
  },
]

for (const { width, label } of HEADER_WRAP_BREAKPOINTS) {
  test(`SuperfluidCampaignWidget action cards stack cleanly at ${width}px (${label})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await gotoStory(page, STORY_IDS.noWalletContent)

    const actionLayouts = page.locator('[data-testid^="ActionCard-layout-"]')
    await expect(actionLayouts).toHaveCount(6)

    // Every supported phone width is below the shared 480px $sm breakpoint.
    // The description and action footer must therefore stack instead of
    // competing for the same horizontal line, and its CTA fills that row.
    for (const layout of await actionLayouts.all()) {
      await expect(layout).toHaveCSS('flex-direction', 'column')
      const layoutBox = await layout.boundingBox()
      const buttonBox = await layout.locator('button').boundingBox()
      if (!layoutBox || !buttonBox) throw new Error('Expected action layout and CTA boxes')
      expect(Math.abs(buttonBox.width - layoutBox.width)).toBeLessThan(1)
    }

    const documentScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(documentScrollWidth).toBeLessThanOrEqual(width + 1)

    // No CTA may be silently cut off by the card's rounded overflow boundary.
    const clippedButtons = await findClippedButtons(page)
    for (const actionLabel of ['Claim', 'Invite', 'Vote', 'Fund', 'Donate']) {
      expect(clippedButtons).not.toContain(actionLabel)
    }
  })
}

test('SuperfluidCampaignWidget action cards retain their desktop row above 480px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 900 })
  await gotoStory(page, STORY_IDS.noWalletContent)

  const actionLayouts = page.locator('[data-testid^="ActionCard-layout-"]')
  await expect(actionLayouts).toHaveCount(6)
  for (const layout of await actionLayouts.all()) {
    await expect(layout).toHaveCSS('flex-direction', 'row')
  }
})

for (const view of HEADER_WRAP_VIEWS) {
  for (const [i, { width, label }] of HEADER_WRAP_BREAKPOINTS.entries()) {
    const screenshotIndex = view.screenshotBase + i

    test(`SuperfluidCampaignWidget ${view.key} header has no button clipping at ${width}px (${label})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await gotoStory(page, view.storyUrl)

      // headerButtonText is matched against either visible text (Connect wallet)
      // or an aria-label (Close leaderboard's icon-only button has no text content).
      await expect(
        page.getByText(view.headerButtonText).or(page.getByLabel(view.headerButtonText)),
      ).toBeVisible()

      // Document must never grow wider than the viewport — a +1px tolerance
      // absorbs sub-pixel rounding without masking a real overflow.
      const documentScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(documentScrollWidth).toBeLessThanOrEqual(width + 1)

      // A button can be silently clipped by an ancestor's overflow:hidden (e.g.
      // the card's own rounded-corner clipping) without ever growing the
      // document's scrollWidth above — this is exactly how the header CTA was
      // cut off pre-fix.
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

// Regression test for the Leaderboard header's close (X) button: it must stay
// pinned top-right at all times, even when the "Connect wallet"/wallet-chip
// group next to it wraps onto its own row for lack of space. Covers both the
// disconnected (Connect wallet button) and connected (wallet chip) variants
// across the same breakpoint set used above, plus a wide viewport where the
// row comfortably fits on one line, to prove the pin holds in both states.
const LEADERBOARD_CLOSE_BUTTON_VIEWS = [
  { key: 'leaderboard-disconnected', storyUrl: STORY_IDS.noWalletLeaderboard },
  { key: 'leaderboard-connected', storyUrl: STORY_IDS.custodialLeaderboard },
]
const CLOSE_BUTTON_PIN_WIDTHS = [320, 360, 375, 390, 412, 900]

for (const view of LEADERBOARD_CLOSE_BUTTON_VIEWS) {
  for (const width of CLOSE_BUTTON_PIN_WIDTHS) {
    test(`SuperfluidCampaignWidget ${view.key} close button stays pinned top-right at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await gotoStory(page, view.storyUrl)

      const heading = page.getByText('Superfluid', { exact: true })
      const closeButton = page.getByLabel('Close leaderboard')
      await expect(heading).toBeVisible()
      await expect(closeButton).toBeVisible()

      const headingBox = await heading.boundingBox()
      const closeButtonBox = await closeButton.boundingBox()
      if (!headingBox || !closeButtonBox)
        throw new Error('Expected heading and close button to have layout boxes')

      // The close button must remain on the same row as the "Superfluid" wordmark
      // regardless of whether the CTA/wallet-chip group next to it has wrapped —
      // this is the exact bug reported: the close button used to drop down with
      // the CTA instead of staying pinned.
      expect(Math.abs(closeButtonBox.y - headingBox.y)).toBeLessThan(5)
    })
  }
}

// Without an integrator-owned disconnectOverride, the wallet chip keeps its
// Disconnect affordance but explains where the wallet session must be managed.
// Covered on both CampaignHeader (content view) and LeaderboardView, since
// each renders its own copy of the shared WalletChip component.
const WALLET_CHIP_DISCONNECT_VIEWS = [
  { key: 'content', storyUrl: STORY_IDS.custodialContent, screenshotIndex: 35 },
  { key: 'leaderboard', storyUrl: STORY_IDS.custodialLeaderboard, screenshotIndex: 36 },
]

for (const view of WALLET_CHIP_DISCONNECT_VIEWS) {
  test(`SuperfluidCampaignWidget ${view.key} wallet chip: Disconnect without an override shows integrator guidance`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 480, height: 900 })
    await gotoStory(page, view.storyUrl)

    const chip = page.getByLabel('Wallet options')
    await expect(chip).toBeVisible()
    await chip.click()

    const disconnectItem = page.getByText('Disconnect', { exact: true })
    await expect(disconnectItem).toBeVisible()

    await page.screenshot({
      path: `tests/widgets/superfluid-campaign-widget/test-results/scw-${view.screenshotIndex}-${view.key}-wallet-chip-menu-open.png`,
      fullPage: true,
    })

    await disconnectItem.click()

    await expect(page.getByText('Disconnect should be done in your wallets session')).toBeVisible()
    await expect(chip).toBeVisible()

    await page.screenshot({
      path: `tests/widgets/superfluid-campaign-widget/test-results/scw-${view.screenshotIndex}-${view.key}-wallet-chip-after-disconnect.png`,
      fullPage: true,
    })
  })
}
