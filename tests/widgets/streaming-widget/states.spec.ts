import { test, expect, type Page } from '@playwright/test'

const STORY_PREFIX = '/iframe.html?id=widgets-streamingwidget--'

function storyUrl(storyId: string): string {
  return `${STORY_PREFIX}${storyId}&viewMode=story`
}

async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(storyUrl(storyId))
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.innerText.trim().length > 0)
}

async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText)
}

async function expectBodyToContain(page: Page, patterns: Array<string | RegExp>) {
  const text = await bodyText(page)
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      expect(text).toContain(pattern)
    } else {
      expect(text).toMatch(pattern)
    }
  }
}

async function saveScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/widgets/streaming-widget/test-results/${name}.png`,
    fullPage: true,
  })
}

test('StreamingWidget shows the disconnected wallet gate', async ({ page }) => {
  await gotoStory(page, 'no-wallet')

  await expectBodyToContain(page, ['Wallet not connected', 'Connect Wallet'])
  await saveScreenshot(page, 'sw-01-no-wallet')
})

test('StreamingWidget renders tab navigation and switches views', async ({ page }) => {
  await gotoStory(page, 'populated-state')

  await expectBodyToContain(page, ['Streams', 'Pools', 'Balances', 'Active streams'])

  await page.getByText('Pools').first().click()
  await expectBodyToContain(page, ['Claimable', 'Connect to claim'])

  await page.getByText('Balances').first().click()
  await expectBodyToContain(page, ['Super Token Balance', 'SUP Reserve'])

  await saveScreenshot(page, 'sw-02-tab-navigation')
})

test('StreamingWidget shows the unsupported network prompt', async ({ page }) => {
  await gotoStory(page, 'wrong-chain')

  await expectBodyToContain(page, [
    'Unsupported network',
    'Switch to Celo',
    'Switch to Base',
  ])
  await saveScreenshot(page, 'sw-03-wrong-chain')
})

test('StreamingWidget shows loading states for streams and history', async ({ page }) => {
  await gotoStory(page, 'loading-state')

  await expectBodyToContain(page, ['Loading streams', 'Loading stream history'])
  await saveScreenshot(page, 'sw-04-loading-state')
})

test('StreamingWidget shows empty states for streams and history', async ({ page }) => {
  await gotoStory(page, 'empty-state')

  await expectBodyToContain(page, ['No streams found.', 'No stream history found.'])
  await saveScreenshot(page, 'sw-05-empty-state')
})

test('StreamingWidget shows error states for streams and history', async ({ page }) => {
  await gotoStory(page, 'error-state')

  await expectBodyToContain(page, [
    'Unable to reach the network',
    'Unable to load stream history.',
    'Retry',
  ])
  await saveScreenshot(page, 'sw-06-error-state')
})

test('StreamingWidget shows populated incoming and outgoing stream views', async ({ page }) => {
  await gotoStory(page, 'populated-state')

  await expectBodyToContain(page, ['Active streams', 'Stream history', 'Incoming', 'Outgoing'])

  await page.getByText('Incoming').first().click()
  await expectBodyToContain(page, ['Incoming'])

  await page.getByText('Outgoing').first().click()
  await expectBodyToContain(page, ['Outgoing'])

  await saveScreenshot(page, 'sw-07-populated-streams')
})

test('StreamingWidget create/update form shows invalid input feedback', async ({ page }) => {
  await gotoStory(page, 'create-update-invalid-input')

  await expectBodyToContain(page, [
    'Create / Update Stream',
    'Recipient must be a valid Ethereum address',
  ])
  await saveScreenshot(page, 'sw-08-create-update-invalid')
})

test('StreamingWidget create/update form shows pending and success states', async ({ page }) => {
  await gotoStory(page, 'create-update-pending')
  await expectBodyToContain(page, ['Create / Update Stream', 'Transaction pending...'])
  await saveScreenshot(page, 'sw-09-create-update-pending')

  await gotoStory(page, 'create-update-success')
  await expectBodyToContain(page, ['Create / Update Stream', 'Stream set! Tx:'])
  await saveScreenshot(page, 'sw-10-create-update-success')
})

test('StreamingWidget create/update form shows failure state', async ({ page }) => {
  await gotoStory(page, 'create-update-failure')

  await expectBodyToContain(page, ['Create / Update Stream', 'Transaction cancelled by wallet.'])
  await saveScreenshot(page, 'sw-11-create-update-failure')
})

test('StreamingWidget shows pool claim amount and lifecycle states', async ({ page }) => {
  await gotoStory(page, 'pool-claim-state')
  await expectBodyToContain(page, ['Claimable', '12.5', 'Connect to claim'])
  await saveScreenshot(page, 'sw-12-pool-claim')

  await gotoStory(page, 'pool-claim-pending')
  await expectBodyToContain(page, ['Claimable'])
  await saveScreenshot(page, 'sw-13-pool-claim-pending')

  await gotoStory(page, 'pool-claim-success')
  await expectBodyToContain(page, ['Connected', 'Done'])
  await saveScreenshot(page, 'sw-14-pool-claim-success')

  await gotoStory(page, 'pool-claim-error')
  await expectBodyToContain(page, ['Pool claim failed. Please retry.', 'Failed'])
  await saveScreenshot(page, 'sw-15-pool-claim-error')
})

test('StreamingWidget shows Base SUP reserve and disables reserve off Base', async ({ page }) => {
  await gotoStory(page, 'base-sup-balance-and-reserve')
  await expectBodyToContain(page, ['Super Token Balance', 'SUP Reserve (Staked)', '95.25'])
  await saveScreenshot(page, 'sw-16-base-sup-reserve')

  await gotoStory(page, 'non-base-sup-reserve-disabled')
  await expectBodyToContain(page, [
    'Super Token Balance',
    'SUP Reserve',
    'Reserve data is only available on Base',
  ])
  await saveScreenshot(page, 'sw-17-non-base-reserve-disabled')
})
