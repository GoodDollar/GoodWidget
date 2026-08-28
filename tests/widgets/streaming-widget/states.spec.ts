import { test, expect, type Page } from '@playwright/test'

const STORY_PREFIX = '/iframe.html?id=qa-streamingwidget-runtime-fixtures--'

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

  await expectBodyToContain(page, ['Streams', 'History', 'Pools', 'Balances', 'Active streams'])

  await page.getByText('History').first().click()
  await expectBodyToContain(page, ['Stream history', 'Show more'])

  await page.getByText('Pools').first().click()
  await expectBodyToContain(page, ['Claimable', 'Claim', 'Connect'])

  await page.getByText('Balances').first().click()
  await expectBodyToContain(page, ['Super Token Balance', 'SUP Balance', 'SUP Reserve'])

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

  await expectBodyToContain(page, ['Loading streams'])

  await page.getByText('History').first().click()
  await expectBodyToContain(page, ['Loading stream history'])
  await saveScreenshot(page, 'sw-04-loading-state')
})

test('StreamingWidget shows empty states for streams and history', async ({ page }) => {
  await gotoStory(page, 'empty-state')

  await expectBodyToContain(page, ['No active streams found.'])

  await page.getByText('History').first().click()
  await expectBodyToContain(page, ['No stream history found.'])
  await saveScreenshot(page, 'sw-05-empty-state')
})

test('StreamingWidget shows error states for streams and history', async ({ page }) => {
  await gotoStory(page, 'error-state')

  await expectBodyToContain(page, ['Unable to reach the network', 'Retry'])

  await page.getByText('History').first().click()
  await expectBodyToContain(page, ['Unable to load stream history.', 'Retry'])
  await saveScreenshot(page, 'sw-06-error-state')
})

test('StreamingWidget shows populated incoming and outgoing stream views', async ({ page }) => {
  await gotoStory(page, 'populated-state')

  await expectBodyToContain(page, [
    'Active streams',
    'Incoming',
    'Outgoing',
    /100\s+G\$\s*\/mo/,
  ])

  await page.getByText('Incoming').first().click()
  await expectBodyToContain(page, ['Incoming'])

  await page.getByText('Outgoing').first().click()
  await expectBodyToContain(page, ['Outgoing'])

  await saveScreenshot(page, 'sw-07-populated-streams')

  await page.getByText('History').first().click()
  await expectBodyToContain(page, ['Stream history', 'Show more'])
  await saveScreenshot(page, 'sw-22-stream-history-tab')
})

test('StreamingWidget expands and collapses stream details', async ({ page }) => {
  await gotoStory(page, 'populated-state')

  const expandButton = page.getByRole('button', { name: 'Expand stream details' }).first()
  await expandButton.click()
  await expectBodyToContain(page, ['Token', 'Flow rate', 'Update', 'Cancel stream'])
  await saveScreenshot(page, 'sw-24-stream-details-expanded')

  await page.getByRole('button', { name: 'Collapse stream details' }).first().click()
  await expect(page.getByText('Flow rate', { exact: true })).toHaveCount(0)
  await saveScreenshot(page, 'sw-25-stream-details-collapsed')
})

test('StreamingWidget filters stream history by status', async ({ page }) => {
  await gotoStory(page, 'populated-state')
  await page.getByText('History').first().click()

  await page.getByRole('button', { name: 'Active' }).click()
  await expectBodyToContain(page, ['Active'])
  await expect(page.getByRole('button', { name: 'Expand stream details' })).toHaveCount(2)
  await saveScreenshot(page, 'sw-26-history-active-filter')

  await page.getByRole('button', { name: 'Ended' }).click()
  await expectBodyToContain(page, ['Ended'])
  await expect(page.getByRole('button', { name: 'Expand stream details' })).toHaveCount(4)
  await saveScreenshot(page, 'sw-27-history-ended-filter')
})

test('StreamingWidget covers stream cancellation and update states', async ({ page }) => {
  await gotoStory(page, 'cancel-stream-pending')
  await page.getByRole('button', { name: 'Expand stream details' }).first().click()
  await expect(page.getByRole('button', { name: 'Update' })).toBeVisible()
  await expect(page.getByText('Cancel stream', { exact: true })).toHaveCount(0)
  await saveScreenshot(page, 'sw-28-cancel-stream-pending')

  await gotoStory(page, 'cancel-stream-failure')
  await page.getByRole('button', { name: 'Expand stream details' }).first().click()
  await expectBodyToContain(page, ['Transaction cancelled by wallet.'])
  await saveScreenshot(page, 'sw-29-cancel-stream-failure')

  await gotoStory(page, 'update-stream-form')
  await expect(page.getByRole('heading', { name: 'Update Stream' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Update Stream' })).toBeVisible()
  await saveScreenshot(page, 'sw-30-update-stream-form')
})

test('StreamingWidget renders usable mobile and desktop layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoStory(page, 'populated-state')
  await expectBodyToContain(page, ['Streams', 'History', 'Active streams'])
  await saveScreenshot(page, 'sw-18-mobile-populated')

  await page.setViewportSize({ width: 1280, height: 900 })
  await gotoStory(page, 'populated-state')
  await expectBodyToContain(page, ['Streams', 'History', 'Pools', 'Balances', 'Active streams'])
  await saveScreenshot(page, 'sw-19-desktop-populated')
})

test('StreamingWidget create/update form shows invalid input feedback', async ({ page }) => {
  await gotoStory(page, 'create-update-invalid-input')

  await expectBodyToContain(page, [
    'Create / Update Stream',
    'Recipient must be a valid Ethereum address',
  ])
  await page.getByRole('listbox').click()
  await expectBodyToContain(page, ['per month', 'per day', 'per year'])
  await expect(page.getByText('per second')).toHaveCount(0)
  await expect(page.getByText('per minute')).toHaveCount(0)
  await expect(page.getByText('per hour')).toHaveCount(0)
  await expect(page.getByText('per week')).toHaveCount(0)
  await saveScreenshot(page, 'sw-08-create-update-invalid')
})

test('StreamingWidget create/update form shows pending and success states', async ({ page }) => {
  await gotoStory(page, 'create-update-pending')
  await expectBodyToContain(page, ['Create / Update Stream', '/day', 'Transaction pending...'])
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
  await expectBodyToContain(page, ['Claimable', '12.5', 'Claim'])
  await saveScreenshot(page, 'sw-12-pool-claim')

  await gotoStory(page, 'pool-connected-state')
  await expectBodyToContain(page, ['Connected', 'Claimable', 'Disconnect'])
  await expect(page.getByText('Claim', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Connect', { exact: true })).toHaveCount(0)
  await saveScreenshot(page, 'sw-23-pool-connected')

  await gotoStory(page, 'pool-claim-pending')
  await expectBodyToContain(page, ['Connected', 'Claimable', '12.5', 'Pending', 'Disconnect'])
  await expect(page.getByText('Claim', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Connect', { exact: true })).toHaveCount(0)
  await saveScreenshot(page, 'sw-13-pool-claim-pending')

  await gotoStory(page, 'pool-claim-success')
  await expectBodyToContain(page, ['Connected', 'Claimable', 'Done', 'Disconnect'])
  await expect(page.getByText('Claim', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Connect', { exact: true })).toHaveCount(0)
  await saveScreenshot(page, 'sw-14-pool-claim-success')

  await gotoStory(page, 'pool-claim-error')
  await expectBodyToContain(page, [
    'Connected',
    'Pool claim failed. Please retry.',
    'Failed',
    'Disconnect',
  ])
  await expect(page.getByText('Claim', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Connect', { exact: true })).toHaveCount(0)
  await saveScreenshot(page, 'sw-15-pool-claim-error')

  await gotoStory(page, 'pool-claimable-amount-error')
  await expectBodyToContain(page, ['Could not load claimable amount.', 'Retry'])
  await saveScreenshot(page, 'sw-20-pool-claimable-amount-error')

  await page.getByText('Retry').first().click()
  await expectBodyToContain(page, ['Loading pool memberships'])
  await saveScreenshot(page, 'sw-21-pool-claimable-retry-loading')
})

test('StreamingWidget shows read-only Base SUP balance and reserve data', async ({ page }) => {
  await gotoStory(page, 'base-sup-balance-and-reserve')
  await expectBodyToContain(page, [
    'Super Token Balance',
    'SUP Balance',
    'SUP Reserve',
    'To see your active SUP streams visit app.superfluid.org',
    '112.75',
    'Reserve locker',
    'Available',
    'Staked',
    'Open reserve in Superfluid',
  ])
  await saveScreenshot(page, 'sw-16-base-sup-reserve')

  await gotoStory(page, 'non-base-sup-reserve-disabled')
  await expectBodyToContain(page, [
    'Super Token Balance',
    'Celo',
    'SUP Balance',
    'SUP Reserve',
    'To see your active SUP streams visit app.superfluid.org',
    '112.75',
    'Open reserve in Superfluid',
  ])
  await saveScreenshot(page, 'sw-17-non-base-reserve-disabled')
})
