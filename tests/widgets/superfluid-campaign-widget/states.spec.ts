import { test, expect, type BrowserContext, type Page } from '@playwright/test'

// Story IDs derived from the Storybook title 'QA/SuperfluidCampaignWidget/Runtime Fixtures'
// and the named exports in SuperfluidCampaignWidgetQA.stories.tsx.
const STORY_IDS = {
  noWalletContent:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--no-wallet-content&viewMode=story',
  noWalletLeaderboard:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--no-wallet-leaderboard&viewMode=story',
  standaloneLinksContent:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--standalone-links-content&viewMode=story',
  goodWalletLinksContent:
    '/iframe.html?id=qa-superfluidcampaignwidget-runtime-fixtures--good-wallet-links-content&viewMode=story',
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
// (superfluidCampaignWidgetStories.tsx) — 701 = GoodDollar actions (default tab), 710 = Ecosystem actions.
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

async function stubExternalPopup(context: BrowserContext, hostname: string): Promise<void> {
  await context.route(`https://${hostname}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '' }),
  )
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
  await expect(page.getByText('SEASON 7', { exact: true })).toBeVisible()
  // Disconnected CTA is required per #127 acceptance criteria
  await expect(page.getByText('Connect Wallet')).toBeVisible()
  // Leaderboard summary section should be present
  await expect(page.getByText('Leaderboard').first()).toBeVisible()
  // Reward pools should be listed
  await expect(page.getByText('How to participate')).toBeVisible()
  // The Season 6 season-ended notice is gone.
  await expect(page.getByRole('note')).toHaveCount(0)
  await expect(page.getByText('season has ended')).toHaveCount(0)
  await expect(
    page.getByText(
      'Complete eligible actions across GoodDollar, Flow State, Gardens, and AI Credits to earn SUP rewards.',
    ),
  ).toBeVisible()
  await expect(page.getByText('Ends Feb 28th')).toBeVisible()

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
  await expect(page.getByLabel('Invite users: not done').first()).toBeVisible()
  await expect(page.getByRole('note')).toHaveCount(0)
  await expect(page.getByText('Rank', { exact: true })).toBeVisible()
  await expect(page.getByText('Address', { exact: true })).toBeVisible()
  await expect(page.getByText('Points', { exact: true })).toBeVisible()
  await expect(page.getByText('Actions', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Make a one-time donation: not done')).not.toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-02-no-wallet-leaderboard.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget renders connected content view', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialContent)

  await expect(page.getByText('Superfluid Ecosystem Rewards')).toBeVisible()
  await expect(page.getByText('SEASON 7', { exact: true })).toBeVisible()
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
  await expect(page.getByTestId('LeaderboardStatus')).toContainText('Total points: 4,820')
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
  await expect(page.getByTestId('LeaderboardRow-1')).toHaveCSS('min-width', '520px')

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
  await stubExternalPopup(context, 'claim.superfluid.org')
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

  // Default tab (GoodDollar actions, campaignId 701)
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

test('SuperfluidCampaignWidget leaderboard addresses are plain text with a copy button that copies the full address', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await gotoStory(page, STORY_IDS.noWalletLeaderboard)

  await expect(page.getByText(GOOD_DOLLAR_ACTIONS_TOP_ADDRESS)).toBeVisible()
  // The address is no longer a link to the Superfluid explorer.
  await expect(page.getByRole('link', { name: GOOD_DOLLAR_ACTIONS_TOP_ADDRESS })).toHaveCount(0)
  await expect(page.locator('a[href*="explorer.superfluid.org"]')).toHaveCount(0)

  const fullAddress = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'
  await page.getByLabel(`Copy address ${fullAddress}`).click()

  await expect(page.getByText('Address copied')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(fullAddress)

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-40-leaderboard-address-copied.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget leaderboard action icons show a shared tooltip on hover, focus, and tap', async ({
  page,
  browser,
}) => {
  await gotoStory(page, STORY_IDS.noWalletLeaderboard)

  // Hover
  const claimIcon = page.getByLabel('Claim UBI: done').first()
  await claimIcon.hover()
  await expect(page.getByRole('tooltip')).toHaveText('Claim UBI')
  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-41-leaderboard-tooltip-hover.png',
    fullPage: true,
  })
  await page.mouse.move(0, 0)
  await expect(page.getByRole('tooltip')).toHaveCount(0)

  // Keyboard focus, dismissed with Escape
  await claimIcon.evaluate((element) => (element.parentElement as HTMLElement).focus())
  await expect(page.getByRole('tooltip')).toHaveText('Claim UBI')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)

  // Tap on a touch device
  const touchContext = await browser.newContext({ hasTouch: true })
  const touchPage = await touchContext.newPage()
  await gotoStory(touchPage, STORY_IDS.noWalletLeaderboard)
  await touchPage.getByLabel('Invite users: not done').first().tap()
  await expect(touchPage.getByRole('tooltip')).toHaveText('Invite users')
  await touchContext.close()
})

test('SuperfluidCampaignWidget leaderboard tooltips use the Season 7 action labels', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.leaderboardPopulated)
  const goodDollarLabels = ['Claim UBI', 'Invite users', 'Vote on Flow State']
  for (const label of goodDollarLabels) {
    await expect(page.getByLabel(new RegExp(`^${label}: (done|not done)$`)).first()).toBeVisible()
  }

  await page.getByText('Ecosystem actions').click()
  const ecosystemLabels = [
    'Fund GoodBuilders Season 5',
    'Make a one-time donation',
    'Stream to a Community Pool',
    'Buy AI Credits',
    'Subscribe to AI Credits',
  ]
  for (const label of ecosystemLabels) {
    await expect(page.getByLabel(new RegExp(`^${label}: (done|not done)$`)).first()).toBeVisible()
  }
})

test('SuperfluidCampaignWidget leaderboard only shows actions for the selected campaign', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.leaderboardPopulated)

  await expect(page.getByLabel('Claim UBI: done').first()).toBeVisible()
  await expect(page.getByLabel('Stream to a Community Pool: not done')).not.toBeVisible()

  await page.getByText('Ecosystem actions').click()

  await expect(page.getByLabel('Stream to a Community Pool: done').first()).toBeVisible()
  await expect(page.getByLabel('Buy AI Credits: done').first()).toBeVisible()
  await expect(page.getByLabel('Subscribe to AI Credits: done').first()).toBeVisible()
  await expect(page.getByLabel('Claim UBI: not done')).not.toBeVisible()
})

test('SuperfluidCampaignWidget enriches a leaderboard page from per-account point events', async ({
  page,
}) => {
  const account = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

  await page.route('**/points/campaign?*', async (route) => {
    await route.fulfill({
      json: {
        campaignId: 701,
        name: 'GoodDollar Actions',
        slug: 's7-gooddollar',
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
  await expect(page.getByLabel('Invite users: not done')).toBeVisible()
  await expect(page.getByLabel('Vote on Flow State: not done')).toBeVisible()
})

test('SuperfluidCampaignWidget SUP distribution and members: populated from the mocked programs client for campaign 701', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.supTotalsPopulated)

  // Figures come from the mocked runtime client, proving changing values are
  // separate from the stable campaign definition.
  await expect(page.getByText('128,940 / 470,772.75 SUP')).toBeVisible()
  // The programs API fixture adapter supplies the member count.
  await expect(page.getByText('712 participants')).toBeVisible()
  // 710 (Ecosystem actions) is served by the same mocked programs client.
  await expect(page.getByText('262,450 / 874,292.25 SUP')).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-17-sup-totals-populated.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget SUP totals: request failure stays visible with empty fallback totals', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.supTotalsRequestFailed)

  // The zero fallback remains deterministic, but the request failure must not be hidden.
  await expect(page.getByText('0 / 0 SUP')).toHaveCount(2)
  await expect(page.getByText('Request Failed', { exact: true })).toHaveCount(2)
  await expect(
    page.getByText('SUP program totals request failed (500)', { exact: true }),
  ).toHaveCount(2)

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

test('SuperfluidCampaignWidget SUP distribution and members sourced from the programs API for campaign 701', async ({
  page,
}) => {
  // Mock the programs API endpoint with a minimal superjson envelope for campaign 701.
  await page.route('https://claim.superfluid.org/api/programs', async (route) => {
    await route.fulfill({
      json: {
        json: [
          {
            program: {
              id: 701,
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
  await stubExternalPopup(context, 'ubi.gd')
  await gotoStory(page, STORY_IDS.standaloneLinksContent)

  // Click the card via its title text, away from the CTA button itself, to
  // confirm the whole card (not just the button) is a click target.
  const cardTitle = page.getByText('Buy AI Credits', { exact: true }).first()
  await expect(cardTitle).toBeVisible()

  const [newPage] = await Promise.all([context.waitForEvent('page'), cardTitle.click()])
  await newPage.waitForLoadState('domcontentloaded').catch(() => {})
  expect(newPage.url()).toContain('ubi.gd/3UFIqH3')
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
  await stubExternalPopup(context, 'ubi.gd')
  await gotoStory(page, STORY_IDS.standaloneLinksContent)

  const subscribeButton = page.getByRole('button', { name: 'Subscribe', exact: true })
  await expect(subscribeButton).toBeVisible()

  const pagesBefore = context.pages().length
  const [newPage] = await Promise.all([context.waitForEvent('page'), subscribeButton.click()])
  await newPage.waitForLoadState('domcontentloaded').catch(() => {})

  // Give a duplicate-fire regression a moment to open a second tab before
  // asserting exactly one new page resulted from this single click.
  await page.waitForTimeout(300)
  expect(context.pages().length).toBe(pagesBefore + 1)
  expect(newPage.url()).toContain('ubi.gd/4AslL0c')
  await newPage.close()
})

test('SuperfluidCampaignWidget "Coming up soon" actions render disabled, greyed and non-interactive', async ({
  page,
  context,
}) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  const inviteCard = page.getByTestId('ActionCard-layout-invite-users')
  const voteCard = page.getByTestId('ActionCard-layout-flow-state-vote')
  const fundingCard = page.getByTestId('ActionCard-layout-flow-state-funding')
  await expect(inviteCard).toBeVisible()
  await expect(voteCard).toBeVisible()
  await expect(fundingCard).toBeVisible()

  for (const card of [inviteCard, voteCard, fundingCard]) {
    await expect(card.getByText('Coming up soon', { exact: true })).toBeVisible()
    // Disabled actions carry no link at all.
    await expect(card.locator('a[href]')).toHaveCount(0)
  }
  await expect(page.getByLabel('Coming up soon: Invite users')).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await expect(page.getByLabel('Coming up soon: Vote on Flow State')).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await expect(page.getByLabel('Coming up soon: Fund GoodBuilders Season 5')).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  // Points labels stay visible on disabled cards.
  await expect(inviteCard.getByText(/PT/)).toBeVisible()

  const pagesBefore = context.pages().length
  for (const card of [inviteCard, voteCard, fundingCard]) {
    await expect(card).not.toHaveAttribute('tabindex')
    const closedButton = card.getByRole('button', { name: 'Coming up soon' })
    await expect(closedButton).toBeDisabled()

    await card.evaluate((element) => (element as HTMLElement).focus())
    await expect(card).not.toBeFocused()
    await closedButton.evaluate((element) => (element as HTMLElement).focus())
    await expect(closedButton).not.toBeFocused()
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    await page.waitForTimeout(100)
    expect(context.pages().length, 'keyboard activation must not open a page').toBe(pagesBefore)

    await card.click({ force: true })
    await closedButton.click({ force: true })
    await page.waitForTimeout(100)
    expect(context.pages().length, 'clicking a closed action must not open a page').toBe(
      pagesBefore,
    )
  }

  const tabStops = await page
    .locator(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    .count()
  for (let i = 0; i <= tabStops; i += 1) {
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(
        () => document.activeElement?.closest('[aria-label^="Coming up soon:"]') !== null,
      ),
    ).toBe(false)
  }
})

test('SuperfluidCampaignWidget Gardens Donate and Fund actions open Gardens', async ({
  page,
  context,
}) => {
  await gotoStory(page, STORY_IDS.noWalletContent)
  await context.route('https://app.gardens.fund/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: 'Gardens destination' }),
  )
  await page.getByText('Ecosystem actions').click()

  for (const { label, buttonName } of [
    { label: 'gardens-donation', buttonName: 'Donate' },
    { label: 'gardens-funding', buttonName: 'Fund' },
  ]) {
    const card = page.getByTestId(`ActionCard-layout-${label}`)
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      card.getByRole('button', { name: buttonName }).click(),
    ])
    await newPage.waitForLoadState('domcontentloaded').catch(() => {})
    expect(newPage.url()).toBe(
      'https://app.gardens.fund/gardens/42220/0xf42c9ca2b10010142e2bac34ebdddb0b82177684',
    )
    await newPage.close()
  }
})

test('SuperfluidCampaignWidget claim keeps the Superfluid header and can be closed', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  await page.getByTestId('ActionCard-layout-claim-ubi').getByText('Claim', { exact: true }).click()

  await expect(page.getByText('Superfluid Ecosystem Rewards')).toBeVisible()
  const closeButton = page.getByLabel('Close claim widget')
  await expect(closeButton).toBeVisible()
  await closeButton.click()

  await expect(page.getByTestId('ActionCard-layout-claim-ubi')).toBeVisible()
})

test('SuperfluidCampaignWidget invite is disabled with no link and keeps its points label', async ({
  page,
  context,
}) => {
  await gotoStory(page, STORY_IDS.goodWalletLinksContent)

  const inviteCard = page.getByTestId('ActionCard-layout-invite-users')
  await expect(inviteCard.getByRole('button', { name: 'Coming up soon' })).toBeDisabled()
  await expect(inviteCard.locator('a[href]')).toHaveCount(0)

  const pagesBefore = context.pages().length
  await inviteCard.click({ force: true })
  await page.waitForTimeout(100)
  expect(context.pages().length).toBe(pagesBefore)
  await expect(page.getByLabel('Close claim widget')).not.toBeVisible()
})

test('SuperfluidCampaignWidget AI Credits cards show the S7 copy, BUY label and no minimum caption', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  const buyCard = page.getByTestId('ActionCard-layout-ai-credits-purchase')
  await expect(buyCard.getByText('Get 10% more AI credits with G$.')).toBeVisible()
  await expect(buyCard.getByText('1 PT PER 1K G$ (≈ $0.1)')).toBeVisible()
  await expect(buyCard.getByRole('button', { name: 'BUY', exact: true })).toBeEnabled()

  const subscribeCard = page.getByTestId('ActionCard-layout-ai-credits-subscription')
  await expect(subscribeCard.getByText('Stream G$ for 20% more AI credits.')).toBeVisible()
  await expect(subscribeCard.getByText('2 PTS PER 1K G$ (≈ $0.1)')).toBeVisible()
  await expect(subscribeCard.getByRole('button', { name: 'Subscribe', exact: true })).toBeEnabled()

  // The minimum-deposit details live in the FAQ, not on the cards.
  await expect(buyCard.getByText(/Minimum/)).toHaveCount(0)
  await expect(subscribeCard.getByText(/Minimum/)).toHaveCount(0)

  await page.screenshot({
    path: 'tests/widgets/superfluid-campaign-widget/test-results/scw-42-ai-credits-cards.png',
    fullPage: true,
  })
})

test('SuperfluidCampaignWidget Buy and Subscribe lead the Ecosystem actions', async ({ page }) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  const actionLayouts = page.locator('[data-testid^="ActionCard-layout-"]')
  const layoutTestIds = await actionLayouts.evaluateAll((layouts) =>
    layouts.map((layout) => layout.getAttribute('data-testid')),
  )
  // The first three cards belong to GoodDollar actions; the Ecosystem pool follows.
  expect(layoutTestIds.slice(3, 5)).toEqual([
    'ActionCard-layout-ai-credits-purchase',
    'ActionCard-layout-ai-credits-subscription',
  ])
})

test('SuperfluidCampaignWidget FAQ holds the AI Credits minimum deposit details', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.noWalletContent)
  await page.getByText('FAQ', { exact: true }).first().click()
  await page.getByText('How can I earn points by buying AI Credits?', { exact: true }).click()
  await expect(
    page.getByText('Minimum first deposit: $1. No minimum for subsequent deposits.', {
      exact: false,
    }),
  ).toBeVisible()
})

test('SuperfluidCampaignWidget Season 7 card copy for Vote on Flow State and Fund GoodBuilders', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.noWalletContent)

  await expect(page.getByText('Vote to help allocate GoodBuilders Season 5 funding.')).toBeVisible()
  await expect(page.getByText('Fund GoodBuilders Season 5', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Start a stream to the GoodBuilders Season 5 pool.')).toBeVisible()
  await expect(page.getByText('Season 4')).toHaveCount(0)
})

test('SuperfluidCampaignWidget FAQ reflects the Season 7 questions', async ({ page }) => {
  await gotoStory(page, STORY_IDS.noWalletContent)
  await page.getByText('FAQ', { exact: true }).first().click()

  const expectedQuestions = [
    'Can I earn points for inviting users?',
    'How can I earn points by buying AI Credits?',
    'What can I do with AI Credits?',
    'Why are some actions marked ‘Coming up soon’?',
  ]
  for (const question of expectedQuestions) {
    await expect(page.getByText(question, { exact: true })).toBeVisible()
  }
  const removedQuestions = [
    'Why are Vote on Flow State and Funding closed?',
    'When did Ecosystem action points restart?',
    'Are Ecosystem actions still earning points?',
    'How do Flow State voting points work?',
  ]
  for (const question of removedQuestions) {
    await expect(page.getByText(question, { exact: true })).toHaveCount(0)
  }

  await page.getByText('Can I earn points for inviting users?', { exact: true }).click()
  await expect(
    page.getByText(
      'Invite rewards are coming up soon. Invites are currently not eligible for Season 7 points.',
    ),
  ).toBeVisible()
})

const LINK_STORIES = [
  {
    key: 'standalone',
    storyUrl: STORY_IDS.standaloneLinksContent,
    claimSup: 'https://ubi.gd/4iN7RhK',
    buy: 'https://ubi.gd/3UFIqH3',
    subscribe: 'https://ubi.gd/4AslL0c',
    donate: 'https://ubi.gd/4eunQAd',
    stream: 'https://ubi.gd/4zEWvDW',
    claimUbi: 'https://ubi.gd/4BTD7Vb',
    screenshotIndex: 43,
  },
  {
    key: 'goodwallet',
    storyUrl: STORY_IDS.goodWalletLinksContent,
    claimSup: 'https://ubi.gd/4sR6vY1',
    buy: 'https://ubi.gd/4sRkCwz',
    subscribe: 'https://ubi.gd/4Ap8chU',
    donate: 'https://ubi.gd/4zzqRrj',
    stream: 'https://ubi.gd/4C02hl6',
    claimUbi: 'https://ubi.gd/3UuQxWV',
    screenshotIndex: 44,
  },
]

for (const linkStory of LINK_STORIES) {
  test(`SuperfluidCampaignWidget ${linkStory.key} version uses its own tracking links`, async ({
    page,
    context,
  }) => {
    await stubExternalPopup(context, 'ubi.gd')
    await gotoStory(page, linkStory.storyUrl)
    await page.getByText('FAQ', { exact: true }).first().click()

    // Claim SUP CTA opens the integrator's tracked URL.
    const [claimSupPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByText('Claim SUP rewards').first().click(),
    ])
    await claimSupPage.waitForLoadState('domcontentloaded').catch(() => {})
    expect(claimSupPage.url()).toContain(linkStory.claimSup.replace('https://', ''))
    await claimSupPage.close()

    // The FAQ "Learn more and get started" link mirrors the Buy AI Credits link.
    await page.getByText('What can I do with AI Credits?', { exact: true }).click()
    const learnMoreLink = page.getByRole('link', { name: 'Learn more and get started' })
    await expect(learnMoreLink).toHaveAttribute('href', linkStory.buy)

    await page.screenshot({
      path: `tests/widgets/superfluid-campaign-widget/test-results/scw-${linkStory.screenshotIndex}-${linkStory.key}-links-content.png`,
      fullPage: true,
    })
  })

  for (const [actionName, actionTestId, buttonName, expectedUrl] of [
    ['Buy AI Credits', 'ai-credits-purchase', 'BUY', linkStory.buy],
    ['Subscribe', 'ai-credits-subscription', 'Subscribe', linkStory.subscribe],
    ['Donate', 'gardens-donation', 'Donate', linkStory.donate],
    ['Stream', 'gardens-funding', 'Fund', linkStory.stream],
  ] as const) {
    test(`SuperfluidCampaignWidget ${linkStory.key} ${actionName} card and button open ${expectedUrl}`, async ({
      page,
      context,
    }) => {
      await stubExternalPopup(context, 'ubi.gd')
      await gotoStory(page, linkStory.storyUrl)

      const layout = page.getByTestId(`ActionCard-layout-${actionTestId}`)
      for (const trigger of [
        layout.getByRole('button', { name: buttonName, exact: true }),
        layout,
      ]) {
        const [newPage] = await Promise.all([context.waitForEvent('page'), trigger.click()])
        await newPage.waitForLoadState('domcontentloaded').catch(() => {})
        expect(newPage.url()).toContain(expectedUrl.replace('https://', ''))
        await newPage.close()
      }
    })
  }
}

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

// CI and local machines render the monospace font with slightly different line metrics,
// shifting otherwise-equal card heights by a pixel or two.
const CARD_HEIGHT_FONT_METRIC_TOLERANCE_PX = 4

/**
 * The AI Credits cards must never be taller than the tallest other action card
 * (so they never stand out). In the desktop row layout, where every card has a
 * one-line description, they must also not be shorter than the shortest card.
 * Stacked phone layouts size cards to their own copy, so only the upper bound applies.
 */
async function expectAiCreditsCardsMatchOtherCardHeights(
  page: Page,
  { isDesktopRow }: { isDesktopRow: boolean },
) {
  const cardHeightsByActivity = await page.evaluate(() => {
    const heights: Record<string, number> = {}
    for (const layout of document.querySelectorAll('[data-testid^="ActionCard-layout-"]')) {
      const activity = (layout.getAttribute('data-testid') ?? '').replace('ActionCard-layout-', '')
      // The layout sits inside the card, whose role=button element is the visible box.
      const cardElement = layout.closest('[role="button"]')
      heights[activity] = cardElement?.getBoundingClientRect().height ?? 0
    }
    return heights
  })
  const otherCardHeights = Object.entries(cardHeightsByActivity)
    .filter(([activity]) => !activity.startsWith('ai-credits'))
    .map(([, height]) => height)
  const minOtherHeight = Math.min(...otherCardHeights)
  const maxOtherHeight = Math.max(...otherCardHeights)
  for (const activity of ['ai-credits-purchase', 'ai-credits-subscription']) {
    if (isDesktopRow) {
      expect(cardHeightsByActivity[activity]).toBeGreaterThanOrEqual(
        minOtherHeight - CARD_HEIGHT_FONT_METRIC_TOLERANCE_PX,
      )
    }
    expect(cardHeightsByActivity[activity]).toBeLessThanOrEqual(
      maxOtherHeight + CARD_HEIGHT_FONT_METRIC_TOLERANCE_PX,
    )
  }
}

for (const { width, label } of HEADER_WRAP_BREAKPOINTS) {
  test(`SuperfluidCampaignWidget action cards stack cleanly at ${width}px (${label})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await gotoStory(page, STORY_IDS.noWalletContent)

    const actionLayouts = page.locator('[data-testid^="ActionCard-layout-"]')
    await expect(actionLayouts).toHaveCount(8)

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

    await expectAiCreditsCardsMatchOtherCardHeights(page, { isDesktopRow: false })

    // No CTA may be silently cut off by the card's rounded overflow boundary.
    const clippedButtons = await findClippedButtons(page)
    for (const actionLabel of ['Claim', 'Coming up soon', 'BUY', 'Subscribe', 'Donate']) {
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
  await expect(actionLayouts).toHaveCount(8)
  for (const layout of await actionLayouts.all()) {
    await expect(layout).toHaveCSS('flex-direction', 'row')
  }
  await expectAiCreditsCardsMatchOtherCardHeights(page, { isDesktopRow: true })
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

// Without an integrator-owned disconnectOverride, the wallet chip only explains
// where the wallet session must be managed and does not expose a Disconnect action.
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

    await expect(page.getByText('To disconnect, use your wallet.', { exact: true })).toBeVisible()
    await expect(page.getByText('Disconnect', { exact: true })).toHaveCount(0)

    await page.screenshot({
      path: `tests/widgets/superfluid-campaign-widget/test-results/scw-${view.screenshotIndex}-${view.key}-wallet-chip-menu-open.png`,
      fullPage: true,
    })
    await expect(chip).toBeVisible()

    await page.screenshot({
      path: `tests/widgets/superfluid-campaign-widget/test-results/scw-${view.screenshotIndex}-${view.key}-wallet-chip-after-disconnect.png`,
      fullPage: true,
    })
  })
}
