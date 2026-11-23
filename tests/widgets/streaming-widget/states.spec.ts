import { test, expect, type Locator, type Page } from '@playwright/test'

const STORY_PREFIX = '/iframe.html?id=qa-streamingwidget-runtime-fixtures--'

// Every flow is exercised in both themes so light/dark parity stays covered.
const THEMES = ['dark', 'light'] as const
type WidgetTheme = (typeof THEMES)[number]

function storyUrl(storyId: string, theme: WidgetTheme): string {
  return `${STORY_PREFIX}${storyId}&viewMode=story&args=defaultTheme:${theme}`
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

// WCAG contrast ratio between a button's label colour and the fill actually painted behind
// it (walking up to the first non-transparent ancestor background).
async function labelContrast(button: Locator): Promise<number> {
  return button.evaluate((el) => {
    const parse = (c: string) => {
      const [r, g, b, a = 1] = (c.match(/[\d.]+/g) ?? []).map(Number)
      return { r, g, b, a }
    }
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const channel = (v: number) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
    let node: Element | null = el
    let background = parse('rgb(255, 255, 255)')
    while (node) {
      const candidate = parse(getComputedStyle(node).backgroundColor)
      if (candidate.a > 0.5) {
        background = candidate
        break
      }
      node = node.parentElement
    }
    const label = Array.from(el.querySelectorAll('*')).find(
      (child) => child.children.length === 0 && child.textContent?.trim(),
    )
    const foreground = parse(getComputedStyle(label ?? el).color)
    const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
    return (light + 0.05) / (dark + 0.05)
  })
}

// Hover, press and keyboard focus must never fill an outlined button with its own label
// colour. A collapsed label sits at ~1:1, so 2:1 is a safe floor for "still readable".
async function expectReadableInteractiveStates(page: Page, button: Locator) {
  await button.scrollIntoViewIfNeeded()

  await button.hover()
  expect(await labelContrast(button), 'hover').toBeGreaterThan(2)

  await page.mouse.down()
  expect(await labelContrast(button), 'press').toBeGreaterThan(2)
  // Release away from the button so the press does not trigger its action.
  await page.mouse.move(0, 0)
  await page.mouse.up()

  await button.focus()
  expect(await labelContrast(button), 'focus').toBeGreaterThan(2)
  await button.blur()
}

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    async function gotoStory(page: Page, storyId: string): Promise<void> {
      await page.goto(storyUrl(storyId, theme))
      await page.waitForLoadState('domcontentloaded')
      await page.waitForFunction(() => document.body.innerText.trim().length > 0)
    }

    // Screenshots are grouped per theme: test-results/<theme>/<name>.png
    async function saveScreenshot(page: Page, name: string) {
      await page.screenshot({
        path: `tests/widgets/streaming-widget/test-results/${theme}/${name}.png`,
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

      await expectBodyToContain(page, ['Unsupported network', 'Switch to Celo', 'Switch to Base'])
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
      // Heading renders as styled Text, not an h1-h6, so match on text not role.
      await expect(page.getByText('Update Stream').first()).toBeVisible()
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

    test('StreamingWidget create/update form shows pending and success states', async ({
      page,
    }) => {
      await gotoStory(page, 'create-update-pending')
      await expectBodyToContain(page, ['Create / Update Stream', '/day', 'Transaction pending...'])
      await saveScreenshot(page, 'sw-09-create-update-pending')

      await gotoStory(page, 'create-update-success')
      await expectBodyToContain(page, ['Create / Update Stream', 'Stream set! Tx:'])
      await saveScreenshot(page, 'sw-10-create-update-success')
    })

    test('StreamingWidget create/update form shows failure state', async ({ page }) => {
      await gotoStory(page, 'create-update-failure')

      await expectBodyToContain(page, [
        'Create / Update Stream',
        'Transaction cancelled by wallet.',
      ])
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

    test('StreamingWidget theme overrides playground registers light and dark keys', async ({
      page,
    }) => {
      await page.goto(
        `/iframe.html?id=widgets-streamingwidget-theme-overrides--playground&viewMode=story&args=defaultTheme:${theme}`,
      )
      await page.waitForFunction(() => document.body.innerText.trim().length > 0)

      await expectBodyToContain(page, [
        '"light_Button"',
        '"dark_Button"',
        '"light_StreamRow"',
        '"dark_BalanceCard"',
        'Active streams',
      ])
      await saveScreenshot(page, 'sw-31-theme-overrides-playground')
    })
    test('StreamingWidget keeps both switch-network buttons inside the card at 390px', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await gotoStory(page, 'wrong-chain')

      // EmptyStateCard is the direct parent of the "Unsupported network" heading.
      const card = page.getByText('Unsupported network').locator('xpath=..')
      const cardBox = await card.boundingBox()
      expect(cardBox).not.toBeNull()

      for (const name of ['Switch to Celo', 'Switch to Base']) {
        const box = await page.getByRole('button', { name }).boundingBox()
        expect(box, name).not.toBeNull()
        expect(box!.x, `${name} left edge`).toBeGreaterThanOrEqual(cardBox!.x)
        expect(box!.x + box!.width, `${name} right edge`).toBeLessThanOrEqual(
          cardBox!.x + cardBox!.width,
        )
        expect(box!.y + box!.height, `${name} bottom edge`).toBeLessThanOrEqual(
          cardBox!.y + cardBox!.height,
        )
      }
      await saveScreenshot(page, 'sw-32-wrong-chain-mobile')
    })

    test('StreamingWidget keeps secondary button labels readable on hover, press and focus', async ({
      page,
    }) => {
      await gotoStory(page, 'populated-state')
      await expectReadableInteractiveStates(page, page.getByRole('button', { name: 'Incoming' }))
      await expectReadableInteractiveStates(page, page.getByRole('button', { name: 'Outgoing' }))

      await page.getByRole('button', { name: 'Expand stream details' }).first().click()
      await expectReadableInteractiveStates(page, page.getByRole('button', { name: 'Update' }))

      await page.getByText('History').first().click()
      await expectReadableInteractiveStates(page, page.getByRole('button', { name: 'Refresh' }))
      await expectReadableInteractiveStates(page, page.getByRole('button', { name: 'Active' }))

      await gotoStory(page, 'create-update-success')
      await expectReadableInteractiveStates(page, page.getByRole('button', { name: 'Reset' }))

      await gotoStory(page, 'pool-claim-state')
      await expectReadableInteractiveStates(
        page,
        page.getByRole('button', { name: 'Connect', exact: true }),
      )

      await gotoStory(page, 'pool-connected-state')
      await expectReadableInteractiveStates(page, page.getByRole('button', { name: 'Disconnect' }))

      await gotoStory(page, 'pool-claimable-amount-error')
      const retry = page.getByRole('button', { name: 'Retry' })
      await retry.hover()
      await saveScreenshot(page, 'sw-33-secondary-button-hover')
      await expectReadableInteractiveStates(page, retry)
    })
  })
}
