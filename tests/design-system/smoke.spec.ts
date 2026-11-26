/**
 * smoke.spec.ts — Playwright smoke tests for the GoodWidget Storybook.
 *
 * Tests navigate to Storybook story URLs and verify key elements render.
 * Storybook story URLs follow the pattern:
 *   http://localhost:6006/?path=/story/<story-id>
 *
 * Story IDs are derived from the story title and story name:
 *   title: 'Design System/Primitives/Card' + name: 'Default'
 *   → design-system-primitives-card--default
 *
 * Running:
 *   pnpm test:storybook   (uses @storybook/test-runner — interaction + play tests)
 *
 *   For Playwright screenshot/trace tests:
 *   pnpm test:demo        (if kept in root package.json)
 *
 * Artifact output:
 *   tests/design-system/test-results/  — local screenshots from this spec
 *   test-results/                      — Playwright traces/videos/attachments (gitignored)
 *
 * data-testid naming convention:
 *   ComponentName-variant   e.g. Card-default, GlowCard-default, ClaimWidget-default
 */
import { test, expect, Page, Locator } from '@playwright/test'

/** Navigate to a Storybook story URL and wait for the canvas to render. */
async function gotoStory(page: Page, storyId: string): Promise<void> {
  await page.goto(`/?path=/story/${storyId}`)
  // Wait for Storybook to finish loading the story (the canvas iframe appears)
  await page.waitForSelector('#storybook-preview-iframe', { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
}

/** Get the content frame inside the Storybook canvas iframe. */
function getStoryFrame(page: Page) {
  return page.frameLocator('#storybook-preview-iframe')
}

/** Capture only the rendered story canvas, excluding Storybook chrome. */
async function screenshotStory(page: Page, path: string): Promise<void> {
  await page.locator('#storybook-preview-iframe').screenshot({ path })
}

test('Card/Default story renders', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-card--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Card-default')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-card-default.png')
})

test('GlowCard/Default story renders', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-glowcard--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('GlowCard-default')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-glowcard-default.png')
})

test('Drawer/Default story renders trigger', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-drawer--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Drawer-trigger')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-drawer-default.png')
})

test('TokenAmount/Default story renders', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-tokenamount--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('TokenAmount-default')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-tokenamount-default.png')
})

test('ClaimWidget/Default story renders in mock-connected state', async ({ page }) => {
  await gotoStory(page, 'widgets-claimwidget-theme-demo-showcase--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('ClaimWidget-default')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-claimwidget-default.png')
})

test('ClaimWidget/LightTheme story renders', async ({ page }) => {
  await gotoStory(page, 'widgets-claimwidget-theme-demo-showcase--light-theme')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('ClaimWidget-light')).toBeVisible()
})

test('ClaimWidget/CobaltBrand story renders', async ({ page }) => {
  await gotoStory(page, 'widgets-claimwidget-theme-demo-showcase--cobalt-brand')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('ClaimWidget-cobalt')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-claimwidget-cobalt.png')
})

test('ClaimWidget/TealBrand story renders', async ({ page }) => {
  await gotoStory(page, 'widgets-claimwidget-theme-demo-showcase--teal-brand')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('ClaimWidget-teal')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-claimwidget-teal.png')
})

test('ThemePlayground/DefaultPreset story renders', async ({ page }) => {
  await gotoStory(page, 'design-system-theming-override-playground--default-preset')
  const frame = getStoryFrame(page)
  await expect(frame.locator('text=Preset Baseline')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-theme-default.png')
})

test('Stepper/Default story renders active-step hierarchy', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-stepper--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Stepper-default')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-stepper-default.png')
})

test('Scorecard/Default story renders all 5 mock-data rows in both variants', async ({ page }) => {
  // Taller than the default viewport so both the bare and card rows fit
  // without clipping — 10 cards across two rows need more vertical space
  // than a single-row story. 1000 (rather than 900) accounts for the
  // increased card padding/spacing from the golden-ratio spacing pass;
  // 1080 accounts for the extra subtitle line added to two of the rows.
  await page.setViewportSize({ width: 1280, height: 1080 })
  await gotoStory(page, 'design-system-primitives-scorecard--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Scorecard-default')).toBeVisible()

  const rowSlugs = ['total-spent', 'ai-credits', 'active-days', 'unique-wallets', 'daily-flow-rate']
  for (const slug of rowSlugs) {
    await expect(frame.getByTestId(`Scorecard-${slug}-bare`)).toBeVisible()
    await expect(frame.getByTestId(`Scorecard-${slug}-card`)).toBeVisible()
  }

  // subtitle renders below the trend row when trend is present (unique-wallets)
  // and directly below the value row when trend is absent (daily-flow-rate).
  await expect(frame.getByTestId('Scorecard-unique-wallets-bare').getByText('Last 30 days')).toBeVisible()
  await expect(frame.getByTestId('Scorecard-daily-flow-rate-bare').getByText('From AntSeed vault')).toBeVisible()

  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-default.png')
})

test('Scorecard/ValueFormatter story uses the caller formatter over the default format', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-scorecard--value-formatter')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Scorecard-value-default').getByText('19.7K', { exact: true })).toBeVisible()
  await expect(frame.getByTestId('Scorecard-value-exact').getByText('19,720', { exact: true })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-value-formatter.png')
})

test('Scorecard/Tile story draws a tighter card with smaller secondary text', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-scorecard--tile')
  const frame = getStoryFrame(page)
  const measure = (testId: string, labelText: string) =>
    frame.getByTestId(testId).evaluate(
      (content, text) => {
        const card = content.parentElement!
        const label = [...content.querySelectorAll('span')].find((element) => element.textContent === text)!
        return {
          height: card.getBoundingClientRect().height,
          paddingTop: parseFloat(getComputedStyle(card).paddingTop),
          labelSize: parseFloat(getComputedStyle(label).fontSize),
        }
      },
      labelText,
    )
  const card = await measure('Scorecard-tile-card', 'Card')
  const tile = await measure('Scorecard-tile-tile', 'Tile')
  // md value text is 24 px: tile padding 0.42 x 24, small text one step below the card's (14.8 -> 12).
  expect(tile.paddingTop).toBeCloseTo(24 * 0.42, 0)
  expect(tile.labelSize).toBe(12)
  expect(tile.labelSize).toBeLessThan(card.labelSize)
  expect(tile.height).toBeLessThan(card.height)
  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-tile.png')
})

test('Scorecard/Grid story lays tiles in equal columns, more per row on a wide screen', async ({ page }) => {
  const columnsAt = async (viewportWidth: number) => {
    await page.setViewportSize({ width: viewportWidth, height: 900 })
    await gotoStory(page, 'design-system-primitives-scorecard--grid')
    const frame = getStoryFrame(page)
    await expect(frame.getByTestId('Scorecard-grid')).toBeVisible()
    const boxes = await Promise.all(
      ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'].map(
        async (name) => (await frame.getByTestId(`Scorecard-grid-${name}`).locator('..').boundingBox())!,
      ),
    )
    // Every tile the same width, last row included.
    for (const box of boxes) expect(box.width).toBeCloseTo(boxes[0].width, 0)
    return boxes.filter((box) => Math.abs(box.y - boxes[0].y) < 1).length
  }
  const narrow = await columnsAt(390)
  const wide = await columnsAt(1280)
  expect(wide).toBeGreaterThan(narrow)
  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-grid.png')
})

test('Scorecard/Hover story opens a full, on-screen box over the hovered tile', async ({ page }) => {
  for (const viewportWidth of [1280, 390]) {
    await page.setViewportSize({ width: viewportWidth, height: 900 })
    await gotoStory(page, 'design-system-primitives-scorecard--hover')
    const frame = getStoryFrame(page)
    const box = frame.getByTestId('chart-tooltip')
    await expect(box).toHaveCount(0)

    const longTile = frame.getByTestId('Scorecard-hover-long').locator('..')
    await longTile.hover()
    await expect(box).toBeVisible()
    // Names and numbers in full: nothing ellipsized.
    for (const text of ['A much longer project name', 'G$ moved', ': G$ 1,701,511', 'Last week', ': G$ 835,380']) {
      await expect(box.getByText(text, { exact: true })).toBeVisible()
    }
    const boxRect = (await box.boundingBox())!
    const tileRect = (await longTile.boundingBox())!
    // Inside the screen, and centered on the tile unless the screen edge moved it.
    expect(boxRect.x).toBeGreaterThanOrEqual(0)
    expect(boxRect.x + boxRect.width).toBeLessThanOrEqual(viewportWidth)
    expect(Math.abs(boxRect.y + boxRect.height / 2 - (tileRect.y + tileRect.height / 2))).toBeLessThan(2)
    if (viewportWidth === 1280) {
      expect(Math.abs(boxRect.x + boxRect.width / 2 - (tileRect.x + tileRect.width / 2))).toBeLessThan(2)
      // The box overhangs the tile here; moving onto the overhang keeps it open.
      expect(boxRect.x + boxRect.width).toBeGreaterThan(tileRect.x + tileRect.width + 4)
      await page.mouse.move(tileRect.x + tileRect.width / 2, tileRect.y + tileRect.height / 2)
      await page.mouse.move(boxRect.x + boxRect.width - 3, boxRect.y + boxRect.height / 2, { steps: 5 })
      await expect(box).toBeVisible()
    }

    await page.mouse.move(0, 0)
    await expect(box).toHaveCount(0)
  }

  // Keyboard: focusing the scorecard opens the box and links it; Tab away closes it.
  await page.setViewportSize({ width: 1280, height: 900 })
  await gotoStory(page, 'design-system-primitives-scorecard--hover')
  const keyboardTrigger = getStoryFrame(page)
    .getByTestId('Scorecard-hover-bravo')
    .locator('xpath=ancestor::*[@tabindex="0"][1]')
  await keyboardTrigger.focus()
  const focusedBox = getStoryFrame(page).getByRole('tooltip')
  await expect(focusedBox).toContainText('Bravo')
  await expect(keyboardTrigger).toHaveAttribute('aria-describedby', (await focusedBox.getAttribute('id'))!)
  await keyboardTrigger.blur()
  await expect(focusedBox).toHaveCount(0)
  await keyboardTrigger.focus()
  // The role="tooltip" anchor has no size of its own (the box inside it is positioned), so check its text.
  await expect(focusedBox).toContainText('Bravo')
  await expect(getStoryFrame(page).getByTestId('chart-tooltip')).toBeVisible()
  // A resize closes it (the scorecard moves); focusing again reopens it.
  await page.setViewportSize({ width: 1000, height: 900 })
  await expect(focusedBox).toHaveCount(0)
  await keyboardTrigger.blur()
  await keyboardTrigger.focus()
  await expect(focusedBox).toContainText('Bravo')
  await page.keyboard.press('Escape')
  await expect(focusedBox).toHaveCount(0)

  await getStoryFrame(page).getByTestId('Scorecard-hover-alpha').locator('..').hover()
  await expect(getStoryFrame(page).getByTestId('chart-tooltip')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-hover.png')
})

test('Scorecard/GridNarrowHost story shrinks the single column to a host narrower than its minimum', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-scorecard--grid-narrow-host')
  const frame = getStoryFrame(page)
  const host = (await frame.getByTestId('Scorecard-grid-narrow-host').boundingBox())!
  for (const name of ['alpha', 'bravo']) {
    const tile = (await frame.getByTestId(`Scorecard-grid-narrow-${name}`).locator('..').boundingBox())!
    expect(tile.x + tile.width).toBeLessThanOrEqual(host.x + host.width + 0.5)
    expect(tile.width).toBeCloseTo(host.width, 0)
  }
})

test('Scorecard/HoverWiderThanScreen story keeps the box on screen with every value whole', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await gotoStory(page, 'design-system-primitives-scorecard--hover-wider-than-screen')
  const frame = getStoryFrame(page)
  await frame.getByTestId('Scorecard-hover-wide-alpha').locator('..').hover()
  const box = frame.getByTestId('chart-tooltip')
  await expect(box).toBeVisible()
  const screen = (await page.locator('#storybook-preview-iframe').boundingBox())!
  const boxRect = (await box.boundingBox())!
  expect(boxRect.x).toBeGreaterThanOrEqual(screen.x)
  expect(boxRect.x + boxRect.width).toBeLessThanOrEqual(screen.x + screen.width)
  // Values whole and inside the box; the long row names are shortened instead.
  for (const value of ['G$ 1,701,511', 'G$ 1,632,904']) {
    const valueRect = (await box.getByText(value, { exact: true }).boundingBox())!
    expect(valueRect.x + valueRect.width).toBeLessThanOrEqual(boxRect.x + boxRect.width)
  }
  await expect(box.getByText(/^This week.*…$/)).toBeVisible()
})

test('Scorecard/AbbreviateFrom story shortens from 10,000 by default, from any threshold, or never', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-scorecard--abbreviate-from')
  const frame = getStoryFrame(page)
  const valueIn = (testId: string, text: string) => frame.getByTestId(testId).getByText(text, { exact: true })
  await expect(valueIn('Scorecard-abbreviate-default-small', '1,972')).toBeVisible()
  await expect(valueIn('Scorecard-abbreviate-default-large', '12.3K')).toBeVisible()
  await expect(valueIn('Scorecard-abbreviate-from-thousand', '2.0K')).toBeVisible()
  await expect(valueIn('Scorecard-abbreviate-never', '1,701,511')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-abbreviate.png')
})

test('Scorecard/TrendText story shows the caller trend text in place of the percentage', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-scorecard--trend-text')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Scorecard-trend-up').getByText('+91 (+11.9%)', { exact: true })).toBeVisible()
  await expect(frame.getByTestId('Scorecard-trend-down').getByText('-40 (-3.2%)', { exact: true })).toBeVisible()
  await expect(frame.getByTestId('Scorecard-trend-neutral').getByText('No change', { exact: true })).toBeVisible()
  await expect(frame.getByTestId('Scorecard-trend-up').getByText('+11.9%', { exact: true })).toHaveCount(0)
  // Neutral with the caller's text: no dash glyph; up keeps its arrow.
  await expect(frame.getByTestId('Scorecard-trend-neutral').locator('svg')).toHaveCount(0)
  await expect(frame.getByTestId('Scorecard-trend-up').locator('svg')).toHaveCount(1)
  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-trend-text.png')
})

test('Scorecard/Unavailable story shows N/A with the reason and no trend row', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-scorecard--unavailable')
  const frame = getStoryFrame(page)
  const card = frame.getByTestId('Scorecard-unavailable-card')
  await expect(card.getByText('N/A', { exact: true })).toBeVisible()
  await expect(card.getByText('Not tracked yet', { exact: true })).toBeVisible()
  await expect(card.getByText('+11.9%', { exact: true })).toHaveCount(0)
  await expect(frame.getByTestId('Scorecard-available-card').getByText('+11.9%', { exact: true })).toBeVisible()
  // N/A never calls the formatter, so a formatter that rejects NaN can't break it.
  const nan = frame.getByTestId('Scorecard-unavailable-nan')
  await expect(nan.getByText('N/A', { exact: true })).toBeVisible()
  await expect(nan.getByText('No repo registered', { exact: true })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-unavailable.png')
})

test('Scorecard/AccentColor story draws a colored top border only when accentColor is set', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-scorecard--accent-color')
  const frame = getStoryFrame(page)
  const topBorder = (testId: string) =>
    frame
      .getByTestId(testId)
      .locator('..')
      .evaluate((card) => {
        const style = getComputedStyle(card)
        return { color: style.borderTopColor, width: parseFloat(style.borderTopWidth) }
      })
  const accent = await topBorder('Scorecard-accent-violet')
  expect(accent.color).toBe('rgb(108, 92, 231)')
  // A sixth of the value text: 24 px value (md) = 4 px; lg's ~38.8 px value = ~6.5 px, which
  // browsers round down to whole device pixels.
  expect(accent.width).toBe(4)
  expect((await topBorder('Scorecard-accent-large')).width).toBe(6)
  expect((await topBorder('Scorecard-accent-none')).width).toBe(1)
  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-accent.png')
})

test('Scorecard/DetailLines story draws the breakdown lines between the value and the trend row', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-scorecard--detail-lines')
  const frame = getStoryFrame(page)
  const card = frame.getByTestId('Scorecard-detail-card')
  const inLine = card.getByText('in G$ 866.1K', { exact: true })
  const outLine = card.getByText('out G$ 835.4K', { exact: true })
  const trend = card.getByText('+68.6K (+4.2%)', { exact: true })
  await expect(inLine).toBeVisible()
  await expect(outLine).toBeVisible()
  const [inBox, outBox, trendBox] = await Promise.all([inLine.boundingBox(), outLine.boundingBox(), trend.boundingBox()])
  expect(inBox!.y).toBeLessThan(outBox!.y)
  expect(outBox!.y).toBeLessThan(trendBox!.y)
  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-detail-lines.png')
})

test('Carousel/ThreeSlides story moves by arrow, dot and faded-slide click without changing height', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-carousel--three-slides')
  const frame = getStoryFrame(page)
  const carousel = frame.getByTestId('Carousel-three')
  await expect(carousel).toBeVisible()
  const track = frame.getByTestId('Carousel-three-track')
  const isCurrent = (index: number) =>
    frame.getByTestId(`Carousel-three-dot-${index}`).getAttribute('aria-current')
  const startHeight = (await track.boundingBox())!.height

  await expect(frame.getByTestId('Carousel-three-previous')).toHaveCount(0)
  expect(await isCurrent(0)).toBe('true')
  // About a sixth (0.18) of the arrow sits outside the slides' right edge.
  const nextBox = (await frame.getByTestId('Carousel-three-next').boundingBox())!
  const trackBox = (await track.boundingBox())!
  expect(nextBox.x + nextBox.width - (trackBox.x + trackBox.width)).toBeCloseTo(nextBox.width * 0.18, 0)

  await frame.getByTestId('Carousel-three-next').click()
  await expect.poll(() => isCurrent(1)).toBe('true')
  expect((await track.boundingBox())!.height).toBe(startHeight)

  await frame.getByTestId('Carousel-three-dot-2').click()
  await expect.poll(() => isCurrent(2)).toBe('true')
  await expect(frame.getByTestId('Carousel-three-next')).toHaveCount(0)
  expect((await track.boundingBox())!.height).toBe(startHeight)

  // Arrows and dots are native buttons: keyboard focus plus Enter moves too.
  await expect(frame.getByTestId('Carousel-three-previous')).toHaveJSProperty('tagName', 'BUTTON')
  await expect(frame.getByTestId('Carousel-three-dot-0')).toHaveJSProperty('tagName', 'BUTTON')
  await frame.getByTestId('Carousel-three-dot-1').focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => isCurrent(1)).toBe('true')
  await frame.getByTestId('Carousel-three-dot-2').click()
  await expect.poll(() => isCurrent(2)).toBe('true')

  // The faded middle slide peeks in on the left; clicking it moves back to it.
  await frame.getByTestId('Carousel-three-slide-1').click({ position: { x: 10, y: 10 } })
  await expect.poll(() => isCurrent(1)).toBe('true')
  await screenshotStory(page, 'tests/design-system/test-results/story-carousel-three.png')
})

test('Carousel sizes arrows and dots from its text size, larger on a wide screen', async ({ page }) => {
  // The comparison story's carousel spans the page, unlike the fixed-width Carousel demo stories.
  const widthsAt = async (viewportWidth: number, minArrowPx = 0) => {
    await page.setViewportSize({ width: viewportWidth, height: 900 })
    await gotoStory(page, 'design-system-examples-builders-s5-preview-comparison--gd-moved-and-github-score')
    const frame = getStoryFrame(page)
    const arrow = frame.getByTestId('Builders-gd-moved-carousel-next')
    // The size follows the carousel's measured width, which arrives after the first layout.
    await expect.poll(async () => (await arrow.boundingBox())!.width).toBeGreaterThan(minArrowPx)
    const dot = frame.getByTestId('Builders-gd-moved-carousel-dot-0')
    return { arrow: (await arrow.boundingBox())!.width, dot: (await dot.boundingBox())!.width }
  }
  const narrow = await widthsAt(390)
  const wide = await widthsAt(1280, narrow.arrow)
  // Page dot = 0.6 x text, arrow = 2.6 x text, at every width.
  expect(narrow.dot / narrow.arrow).toBeCloseTo(0.6 / 2.6, 1)
  expect(wide.dot / wide.arrow).toBeCloseTo(0.6 / 2.6, 1)
})

test('Carousel/SlideLabels story draws a label above each labelled slide, in the carousel text size', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-carousel--slide-labels')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Carousel-labels')).toBeVisible()
  const label = frame.getByTestId('Carousel-labels-label-0')
  await expect(label).toHaveText('By region · this week')
  await expect(frame.getByTestId('Carousel-labels-label-1')).toHaveCount(0)
  await expect(frame.getByTestId('Carousel-labels-label-2')).toHaveText('By channel · this week')
  // Label sits above its slide's card, 0.6 x its own text size away.
  const labelBox = (await label.boundingBox())!
  const cardBox = (await frame.getByTestId('Carousel-labels-slide-0').getByText('First').boundingBox())!
  expect(labelBox.y + labelBox.height).toBeLessThan(cardBox.y)
  const textSizePx = await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(await label.evaluate((el) => parseFloat(getComputedStyle(el).marginBottom))).toBeCloseTo(textSizePx * 0.6, 0)
  await screenshotStory(page, 'tests/design-system/test-results/story-carousel-labels.png')
})

test('Carousel/SlidesWithLinks story keeps the faded slide inert until it is current', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-carousel--slides-with-links')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Carousel-links')).toBeVisible()
  await expect(frame.getByTestId('Carousel-links-slide-0-content')).toHaveJSProperty('inert', false)
  await expect(frame.getByTestId('Carousel-links-slide-1-content')).toHaveJSProperty('inert', true)
  // Tabbing from the current slide's link skips the faded slide's link.
  await frame.getByTestId('Carousel-links-First').focus()
  await page.keyboard.press('Tab')
  await expect(frame.getByTestId('Carousel-links-Second')).not.toBeFocused()
  await frame.getByTestId('Carousel-links-next').click()
  await expect(frame.getByTestId('Carousel-links-slide-1-content')).toHaveJSProperty('inert', false)
  await expect(frame.getByTestId('Carousel-links-slide-0-content')).toHaveJSProperty('inert', true)
})

test('Carousel/NarrowSlides story reaches every slide when slides are narrower than half', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-carousel--narrow-slides')
  const frame = getStoryFrame(page)
  const isCurrent = (index: number) => frame.getByTestId(`Carousel-narrow-dot-${index}`).getAttribute('aria-current')
  for (const index of [1, 2, 3, 0]) {
    await frame.getByTestId(`Carousel-narrow-dot-${index}`).click()
    await expect.poll(() => isCurrent(index)).toBe('true')
  }
})

test('Carousel/SingleSlide story shows no arrows and no dots', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-carousel--single-slide')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Carousel-single')).toBeVisible()
  await expect(frame.getByTestId('Carousel-single-next')).toHaveCount(0)
  await expect(frame.getByTestId('Carousel-single-dot-0')).toHaveCount(0)
})

test('Examples/BuildersS5PreviewComparison story renders tiles, split bars and the over-time line', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 })
  await gotoStory(page, 'design-system-examples-builders-s5-preview-comparison--gd-moved-and-github-score')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Builders-preview-comparison')).toBeVisible()
  await expect(frame.getByTestId('Builders-gd-moved').getByText('G$ 1.7M', { exact: true }).first()).toBeVisible()
  await expect(frame.getByTestId('Builders-gd-moved').getByText('in G$ 866.1K', { exact: true })).toBeVisible()
  await expect(frame.getByTestId('Builders-gd-moved-bars').locator('svg path')).toHaveCount(10)
  await expect(frame.getByTestId('Builders-github-score-line')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-builders-preview-comparison.png')
})

test('PieDonutChart/Default story renders donut (innerRadius=0.6) with center metric, bare and card variants', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-piedonutchart--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('PieDonutChart-default')).toBeVisible()
  await expect(frame.getByTestId('PieDonutChart-funding-donut-bare')).toBeVisible()
  await expect(frame.getByTestId('PieDonutChart-funding-donut-card')).toBeVisible()
  await expect(frame.getByTestId('PieDonutChart-funding-donut-bare').getByText('Total')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-piedonutchart-default.png')
})

test('PieDonutChart/PurePie story renders innerRadius=0 as a filled pie, no center content', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-piedonutchart--pure-pie')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('PieDonutChart-funding-pie-bare')
  await expect(chart).toBeVisible()
  await expect(chart.getByText('Education Hubs')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-piedonutchart-purepie.png')
})

test('PieDonutChart/EmptyState story renders grey ring with "No data"', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-piedonutchart--empty-state')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('PieDonutChart-empty')
  await expect(chart).toBeVisible()
  await expect(chart.getByText('No data', { exact: true })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-piedonutchart-empty.png')
})

test('PieDonutChart/StressTest story renders 120-item aggregation without crashing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-piedonutchart--stress-test')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('PieDonutChart-stress')
  await expect(chart).toBeVisible()
  await expect(chart.getByText('Other')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-piedonutchart-stress.png')
})

test('BarChart/Default story renders vertical bars, bare and card variants', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-barchart--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('BarChart-default')).toBeVisible()
  await expect(frame.getByTestId('BarChart-chains-vertical-bare')).toBeVisible()
  await expect(frame.getByTestId('BarChart-chains-vertical-card')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-default.png')
})

test('BarChart/HorizontalLongLabels story renders swapped axes', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--horizontal-long-labels')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('BarChart-houses-horizontal')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-horizontal.png')
})

test('BarChart/EmptyState story renders zero line with "No data"', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--empty-state')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-empty')
  await expect(chart).toBeVisible()
  await expect(chart.getByText('No data', { exact: true })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-empty.png')
})

test('BarChart/StressTest story renders 150 categories without crashing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-barchart--stress-test')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-stress')
  await expect(chart).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-stress.png')
})

test('BarChart/Stress10Categories story renders 10 bars with every label shown', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-barchart--stress-10-categories')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-stress-10')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg path')).toHaveCount(10)
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-stress-10.png')
})

test('BarChart/Stress100Categories story renders 100 bars with a thinned label set', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-barchart--stress-100-categories')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-stress-100')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg path')).toHaveCount(100)
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-stress-100.png')
})

test('BarChart/Stress1000Categories story renders all 1000 bars but thins category labels to a sparse, readable set', async ({ page }) => {
  // Regression guard for the empty-label degradation bug found and fixed in this QA pass:
  // before the fix, truncateLabelToWidth converged every one of the 1000 per-category label
  // slots to "" once slot width dropped sub-pixel. computeLabelSkipFactor now shows only every
  // Nth label, sized against the widest real label, so a small handful of full-text labels
  // should render instead of zero.
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-barchart--stress-1000-categories')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-stress-1000')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg path')).toHaveCount(1000) // every category still gets its own real bar

  const allLabelTexts = await chart.locator('svg text').allTextContents()
  const categoryLabels = allLabelTexts.filter((text) => text.startsWith('Wallet'))
  expect(categoryLabels.length).toBeGreaterThan(0)
  expect(categoryLabels.length).toBeLessThan(20) // sparse, not one per category
  for (const label of categoryLabels) {
    expect(label).not.toBe('') // never converges to unreadable empty strings
  }

  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-stress-1000.png')
})

test('BarChart/Responsive story scales its viewBox to the real container width, not a fixed fallback', async ({ page }) => {
  // Regression guard for the responsive-width distortion bug: the default `width='100%'`
  // path used to freeze the SVG viewBox at a hardcoded 400px regardless of real size.
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-barchart--responsive')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-responsive-chart')
  await expect(chart).toBeVisible()
  const svg = chart.locator('svg').first()
  const viewBoxWidth = Number((await svg.getAttribute('viewBox'))?.split(' ')[2])
  const renderedWidth = (await svg.boundingBox())?.width ?? 0
  expect(Math.abs(viewBoxWidth - renderedWidth)).toBeLessThan(2)
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-responsive.png')
})

test('BarChart/BarColors story draws each bar in its own color', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--bar-colors')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-bar-colors')
  await expect(chart).toBeVisible()
  const fills = await chart.locator('svg path').evaluateAll((paths) => paths.map((p) => p.getAttribute('fill')))
  expect(fills).toEqual(['#6c5ce7', '#00b894', '#e17055', '#0984e3'])
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-bar-colors.png')
})

test('BarChart/HoverLabelAndExactValue story shows the hover label and exact value while bars stay shortened', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--hover-label-and-exact-value')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-hover-exact')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg text').filter({ hasText: /^1\.7M$/ })).toBeVisible()
  await chart.locator('svg path').first().hover()
  const tooltip = chart.getByTestId('chart-tooltip')
  await expect(tooltip).toContainText('Alpha')
  await expect(tooltip).toContainText('Claims')
  await expect(tooltip).toContainText('1,701,511')
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-hover-exact.png')
})

test('BarChart/ValueLabelsOnEveryBar story keeps labels on tiny and zero bars', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--value-labels-on-every-bar')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-every-label')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg text').filter({ hasText: /^1\.7M$/ })).toHaveCount(1)
  await expect(chart.locator('svg text').filter({ hasText: /^10$/ })).toHaveCount(1)
  // Two "0" texts: the value axis's first tick and the zero bar's own label.
  await expect(chart.locator('svg text').filter({ hasText: /^0$/ })).toHaveCount(2)
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-every-label.png')
})

test('BarChart/WithoutValueAxis story draws no number scale, only category and bar labels', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-barchart--without-value-axis')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('BarChart-no-axis')).toBeVisible()
  for (const testId of ['BarChart-no-axis-horizontal', 'BarChart-no-axis-vertical']) {
    const texts = await frame.getByTestId(testId).locator('svg text').allTextContents()
    expect(texts.sort()).toEqual(['1.7M', '412.9K', '866.1K', 'Alpha', 'Beta', 'Gamma'])
  }
  // Vertical: no empty number gutter on the left, so the bars sit about as far from the left
  // edge as from the right one.
  const vertical = frame.getByTestId('BarChart-no-axis-vertical')
  const svgBox = (await vertical.locator('svg').first().boundingBox())!
  const bars = vertical.locator('svg path')
  const first = (await bars.first().boundingBox())!
  const last = (await bars.last().boundingBox())!
  const leftMargin = first.x - svgBox.x
  const rightMargin = svgBox.x + svgBox.width - (last.x + last.width)
  expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(8)
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-no-axis.png')
})

test('BarChart/SegmentedBars story draws each piece and hovers pieces then the total', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--segmented-bars')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-segments-two')
  await expect(chart).toBeVisible()
  // 2 + 2 + 1 pieces: Gamma's zero "Sent" piece draws nothing.
  await expect(chart.locator('svg path')).toHaveCount(5)
  // A thin gap (0.15 x the label text) between a bar's pieces; the outer piece still ends at the full length.
  const textSizePx = Number(await chart.locator('svg text').first().getAttribute('font-size'))
  const firstPiece = (await chart.locator('svg path').nth(0).boundingBox())!
  const secondPiece = (await chart.locator('svg path').nth(1).boundingBox())!
  expect(secondPiece.x - (firstPiece.x + firstPiece.width)).toBeCloseTo(textSizePx * 0.15, 0)
  await chart.locator('svg path').first().hover()
  const tooltip = chart.getByTestId('chart-tooltip')
  await expect(tooltip).toContainText('Alpha')
  await expect(tooltip).toContainText('Volume')
  await expect(tooltip).toContainText('Received')
  await expect(tooltip).toContainText('866,120')
  await expect(tooltip).toContainText('Sent')
  await expect(tooltip).toContainText('835,391')
  await expect(tooltip).toContainText('Total')
  await expect(tooltip).toContainText('1,701,511')
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-segments-two.png')
})

test('BarChart/SegmentedBarsWithLegend story draws the legend above the bars', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--segmented-bars-with-legend')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-segments-legend')
  await expect(chart).toBeVisible()
  const legend = chart.getByTestId('bar-chart-legend')
  await expect(legend.getByText('Received (darker shade)')).toBeVisible()
  await expect(legend.getByText('Sent (lighter shade)')).toBeVisible()
  const legendBox = await legend.boundingBox()
  const plotBox = await chart.locator('svg').first().boundingBox()
  expect(legendBox!.y + legendBox!.height).toBeLessThanOrEqual(plotBox!.y)
  // Swatch = 0.9 x the legend's own text size, which scales with the chart's width.
  const textSizePx = await legend
    .getByText('Received (darker shade)')
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
  const swatchBox = await legend.getByTestId('bar-chart-legend-swatch').first().boundingBox()
  expect(swatchBox!.width).toBeCloseTo(textSizePx * 0.9, 0)
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-segments-legend.png')
})

test('BarChart/SegmentedBarsThreePieces story draws three pieces per bar', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--segmented-bars-three-pieces')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-segments-three')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg path')).toHaveCount(6)
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-segments-three.png')
})

test('BarChart/SegmentedBarsEdgeCases story keeps value as the total and drops negative pieces', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--segmented-bars-edge-cases')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('BarChart-segments-edge')
  await expect(chart).toBeVisible()
  // Mismatch: 2 pieces; Negative: the -10,000 piece is dropped, 1 piece left.
  await expect(chart.locator('svg path')).toHaveCount(3)
  // Two "100K" texts: the axis tick and Mismatch's value label (its total, not the 70K pieces' sum).
  await expect(chart.locator('svg text').filter({ hasText: /^100K$/ })).toHaveCount(2)
  await chart.locator('svg path').first().hover()
  const tooltip = chart.getByTestId('chart-tooltip')
  await expect(tooltip).toContainText('Total')
  await expect(tooltip).toContainText('100,000')
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-segments-edge.png')
})

/** A swatch's width, its corner radius and its legend's text size, from computed styles. */
async function swatchMetrics(swatch: ReturnType<ReturnType<typeof getStoryFrame>['getByTestId']>) {
  return swatch.evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    radius: parseFloat(getComputedStyle(el).borderTopLeftRadius),
    textSize: parseFloat(getComputedStyle(el.nextElementSibling ?? el).fontSize),
  }))
}

test('BarChart/SquareSwatches story draws square legend and hover swatches sized from the text', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--square-swatches')
  const chart = getStoryFrame(page).getByTestId('BarChart-square-swatches')
  await expect(chart).toBeVisible()
  const legend = await swatchMetrics(chart.getByTestId('bar-chart-legend-swatch').first())
  expect(legend.width).toBeCloseTo(legend.textSize * 0.9, 0)
  expect(legend.radius).toBeCloseTo(legend.width * 0.2, 0)
  await chart.locator('svg path').first().hover()
  const hover = await swatchMetrics(chart.getByTestId('chart-tooltip-swatch').first())
  expect(hover.radius).toBeCloseTo(hover.width * 0.2, 0)
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-square-swatches.png')
})

test('BarChart/NameAndValueColumns story puts names in a left column and values in a right column, sized from the text', async ({ page }) => {
  for (const viewportWidth of [1280, 390]) {
    await page.setViewportSize({ width: viewportWidth, height: 700 })
    await gotoStory(page, 'design-system-primitives-barchart--name-and-value-columns')
    const chart = getStoryFrame(page).getByTestId('BarChart-label-columns')
    await expect(chart).toBeVisible()
    const svg = chart.locator('svg').first()
    const svgBox = (await svg.boundingBox())!
    const texts = chart.locator('svg text')
    const names = texts.filter({ hasText: /^(Alpha|A team.*|Gamma|Delta|Epsilon)$/ })
    const values = texts.filter({ hasText: /^(1\.7M|118\.3K|20\.3K|10|0)$/ })
    await expect(names).toHaveCount(5)
    // Every value is drawn, including the tiny and zero bars, right-aligned at the right edge.
    await expect(values).toHaveCount(5)
    const boxes = async (locator: typeof texts) =>
      Promise.all((await locator.all()).map(async (element) => (await element.boundingBox())!))
    for (const box of await boxes(values)) {
      expect(Math.abs(box.x + box.width - (svgBox.x + svgBox.width))).toBeLessThan(2)
    }
    // Names left-aligned at the left edge, in a column at most a third of the chart wide.
    const nameBoxes = await boxes(names)
    for (const box of nameBoxes) expect(Math.abs(box.x - svgBox.x)).toBeLessThan(2)
    const nameRight = Math.max(...nameBoxes.map((box) => box.x + box.width))
    expect(nameRight - svgBox.x).toBeLessThanOrEqual(svgBox.width / 3 + 1)
    // Every bar starts after the name column; with no value axis the longest bar (Alpha) fills its
    // row, ending one column gap (0.7 x text) before the widest value.
    for (const path of await chart.locator('svg path').all()) {
      const box = await path.boundingBox()
      if (box) expect(box.x).toBeGreaterThan(nameRight)
    }
    const alphaBar = (await chart.locator('svg path').first().boundingBox())!
    const valueLeft = Math.min(...(await boxes(values)).map((box) => box.x))
    const rowTextPx = Number(await names.first().getAttribute('font-size'))
    // Within 1.5 px: the value column is sized from a measured width rounded up.
    expect(Math.abs(valueLeft - (alphaBar.x + alphaBar.width) - rowTextPx * 0.7)).toBeLessThan(1.5)
    // As tall as its rows: 5 rows of 1.9 x the row text size, no other gutters.
    const textSizePx = Number(await names.first().getAttribute('font-size'))
    expect(svgBox.height / (5 * textSizePx)).toBeCloseTo(1.9, 1)
    // The long name is past a third of the chart here, so it ends in "…"; short ones stay whole.
    await expect(names.filter({ hasText: /^A team/ })).toHaveText(/…$/)
    await expect(names.filter({ hasText: /^Epsilon$/ })).toHaveCount(1)
  }
  await screenshotStory(page, 'tests/design-system/test-results/story-barchart-label-columns.png')
})

test('BarChart/NameAndValueColumnsWithAxisTitle story keeps the rotated title clear of the names', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--name-and-value-columns-with-axis-title')
  const chart = getStoryFrame(page).getByTestId('BarChart-label-columns-title')
  await expect(chart).toBeVisible()
  const titleBox = (await chart.locator('svg text').filter({ hasText: /^Team$/ }).boundingBox())!
  for (const name of ['Alpha', 'Gamma', 'Delta', 'Epsilon']) {
    const nameBox = (await chart.locator('svg text').filter({ hasText: new RegExp(`^${name}$`) }).boundingBox())!
    expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(nameBox.x)
  }
})

test('BarChart/NameAndValueColumnsOneRow story settles: its width stops changing after layout', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--name-and-value-columns-one-row')
  const chart = getStoryFrame(page).getByTestId('BarChart-label-columns-one-row')
  await expect(chart).toBeVisible()
  // A fractional self-sized height used to make the measured width creep down every frame.
  const svg = chart.locator('svg').first()
  const first = await svg.getAttribute('viewBox')
  await page.waitForTimeout(500)
  expect(await svg.getAttribute('viewBox')).toBe(first)
})

test('BarChart/NameAndValueColumnsOneRow story shows the whole hover box below a one-row chart', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--name-and-value-columns-one-row')
  const chart = getStoryFrame(page).getByTestId('BarChart-label-columns-one-row')
  await chart.locator('svg path').first().hover()
  const tooltip = chart.getByTestId('chart-tooltip')
  await expect(tooltip).toContainText('1,701,511')
  const svgBox = (await chart.locator('svg').first().boundingBox())!
  const tipBox = (await tooltip.boundingBox())!
  // The box is taller than the chart and nothing clips it: the exact value is the top element.
  expect(tipBox.y + tipBox.height).toBeGreaterThan(svgBox.y + svgBox.height)
  const exactValueOnTop = await tooltip.getByText('1,701,511', { exact: false }).evaluate((el) => {
    const rect = el.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
    return hit !== null && (hit === el || el.contains(hit) || hit.contains(el))
  })
  expect(exactValueOnTop).toBe(true)
})

test('BarChart/NameAndValueColumnsEmpty story keeps one row of height so "No data" shows', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-barchart--name-and-value-columns-empty')
  const chart = getStoryFrame(page).getByTestId('BarChart-label-columns-empty')
  await expect(chart.locator('svg text').filter({ hasText: 'No data' })).toBeVisible()
  const svgBox = (await chart.locator('svg').first().boundingBox())!
  const textSizePx = Number(await chart.locator('svg text').first().getAttribute('font-size'))
  expect(svgBox.height / textSizePx).toBeCloseTo(1.9, 1)
})

test('LineAreaChart/Default story renders area fill, reference line, linear and monotone variants', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-lineareachart--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('LineAreaChart-default')).toBeVisible()
  await expect(frame.getByTestId('LineAreaChart-daily-linear')).toBeVisible()
  await expect(frame.getByTestId('LineAreaChart-daily-monotone-card')).toBeVisible()
  await expect(frame.getByTestId('LineAreaChart-daily-linear').getByText('Target')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-default.png')
})

test('LineAreaChart/StepInterpolation story renders a stepped curve', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--step-interpolation')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-step')
  await expect(chart).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-step.png')
})

test('LineAreaChart/MultiSeriesSecondaryAxis story renders both series with a legend and right-side axis', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--multi-series-secondary-axis')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-multi-axis')
  await expect(chart).toBeVisible()
  await expect(chart.getByText('Claims', { exact: true })).toBeVisible()
  // "G$ Price" now renders twice — the legend label (HTML span) and the
  // secondary axis title (SVG text, QA fix: this title used to be a dead
  // prop that never rendered) — assert each by tag instead of the ambiguous
  // shared-text locator this test used before that fix.
  await expect(chart.locator('span').filter({ hasText: /^G\$ Price$/ })).toBeVisible()
  await expect(chart.locator('svg text').filter({ hasText: /^G\$ Price$/ })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-multiaxis.png')
})

test('LineAreaChart/WithGap story renders both visible-gap and bridged variants', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--with-gap')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('LineAreaChart-gap-visible')).toBeVisible()
  await expect(frame.getByTestId('LineAreaChart-gap-bridged')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-gap.png')
})

test('LineAreaChart/EmptyState story renders axes with "No data"', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--empty-state')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-empty')
  await expect(chart).toBeVisible()
  await expect(chart.getByText('No data', { exact: true })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-empty.png')
})

test('LineAreaChart/SinglePoint story renders a single dot', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--single-point')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-single')
  await expect(chart).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-single.png')
})

test('LineAreaChart/StressTest story renders 1095 daily points without crashing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-lineareachart--stress-test')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-stress')
  await expect(chart).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-stress.png')
})

test('LineAreaChart/Stress10Points story renders 10 points with dots visible (below DOT_AUTO_THRESHOLD)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-lineareachart--stress-10-points')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-stress-10')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg circle')).toHaveCount(10)
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-stress-10.png')
})

test('LineAreaChart/Stress100Points story auto-hides dots past DOT_AUTO_THRESHOLD', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-lineareachart--stress-100-points')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-stress-100')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg circle')).toHaveCount(0)
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-stress-100.png')
})

test('LineAreaChart/Stress1000Points story renders 1000 points without crashing, dots hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-lineareachart--stress-1000-points')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-stress-1000')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg circle')).toHaveCount(0)
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-stress-1000.png')
})

test('LineAreaChart/StressManySeries story renders all 12 overlaid series without crashing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-lineareachart--stress-many-series')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-stress-many-series')
  await expect(chart).toBeVisible()
  for (let seriesIndex = 1; seriesIndex <= 12; seriesIndex += 1) {
    await expect(chart.getByText(`Series ${seriesIndex}`, { exact: true })).toBeVisible()
  }
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-stress-manyseries.png')
})

test('LineAreaChart/Responsive story scales its viewBox to the real container width, not a fixed fallback', async ({ page }) => {
  // Regression guard for the responsive-width distortion bug: the default `width='100%'`
  // path used to freeze the SVG viewBox at a hardcoded 400px regardless of real size.
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-lineareachart--responsive')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-responsive-chart')
  await expect(chart).toBeVisible()
  const svg = chart.locator('svg').first()
  const viewBoxWidth = Number((await svg.getAttribute('viewBox'))?.split(' ')[2])
  const renderedWidth = (await svg.boundingBox())?.width ?? 0
  expect(Math.abs(viewBoxWidth - renderedWidth)).toBeLessThan(2)
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-responsive.png')
})

test('LineAreaChart/HoverWeekColumn story shows week header, metric line, exact values highest first', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--hover-week-column')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-hover-week')
  await expect(chart).toBeVisible()
  // Pointer past the last week's x clamps to that week.
  const svg = chart.locator('svg').first()
  const box = (await svg.boundingBox())!
  await svg.hover({ position: { x: box.width - 2, y: box.height / 2 } })
  const tooltip = chart.getByTestId('chart-tooltip')
  await expect(tooltip).toContainText('Week of Nov 15-21')
  await expect(tooltip).toContainText('Score')
  const text = (await tooltip.textContent()) ?? ''
  const order = ['Alpha', 'Golf', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'].map((name) => text.indexOf(name))
  expect(order.every((position) => position >= 0)).toBe(true)
  expect([...order].sort((a, b) => a - b)).toEqual(order)
  await expect(tooltip).toContainText('1,050')
  await expect(tooltip).toContainText('1,012')
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-hover-week.png')
})

test('LineAreaChart/HoverValuesRightAligned story lines the hover values up on the right, without colons', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--hover-values-right-aligned')
  const chart = getStoryFrame(page).getByTestId('LineAreaChart-hover-right-aligned')
  await expect(chart).toBeVisible()
  const svg = chart.locator('svg').first()
  const box = (await svg.boundingBox())!
  await svg.hover({ position: { x: box.width - 2, y: box.height / 2 } })
  const tooltip = chart.getByTestId('chart-tooltip')
  await expect(tooltip).toContainText('Week of Nov 15-21')
  await expect(tooltip).not.toContainText(':')
  const values = tooltip.getByTestId('chart-tooltip-value')
  await expect(values).toHaveCount(7)
  await expect(values.first()).toHaveText('1,050')
  const rights = await Promise.all((await values.all()).map(async (value) => {
    const valueBox = (await value.boundingBox())!
    return valueBox.x + valueBox.width
  }))
  for (const right of rights) expect(Math.abs(right - rights[0])).toBeLessThan(1)
  expect(await values.first().evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toContain('tabular-nums')
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-hover-right-aligned.png')
})

test('LineAreaChart/SquareSwatches story draws square legend and hover swatches sized from the text', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--square-swatches')
  const chart = getStoryFrame(page).getByTestId('LineAreaChart-square-swatches')
  await expect(chart).toBeVisible()
  await expect(chart.getByTestId('line-chart-legend-swatch')).toHaveCount(7)
  const legend = await swatchMetrics(chart.getByTestId('line-chart-legend-swatch').first())
  expect(legend.width).toBeCloseTo(legend.textSize * 0.9, 0)
  expect(legend.radius).toBeCloseTo(legend.width * 0.2, 0)
  const svg = chart.locator('svg').first()
  const box = (await svg.boundingBox())!
  await svg.hover({ position: { x: box.width - 2, y: box.height / 2 } })
  const hover = await swatchMetrics(chart.getByTestId('chart-tooltip-swatch').first())
  expect(hover.radius).toBeCloseTo(hover.width * 0.2, 0)
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-square-swatches.png')
})

test('LineAreaChart/LegendAbove story draws the legend above the chart, 0.8 x its text away', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--legend-above')
  const chart = getStoryFrame(page).getByTestId('LineAreaChart-legend-above')
  await expect(chart).toBeVisible()
  const legend = chart.getByTestId('line-chart-legend')
  await expect(legend).toHaveCount(1)
  const legendBox = (await legend.boundingBox())!
  const plotBox = (await chart.locator('svg').first().boundingBox())!
  const textSizePx = (await swatchMetrics(chart.getByTestId('line-chart-legend-swatch').first())).textSize
  expect(plotBox.y - (legendBox.y + legendBox.height)).toBeCloseTo(textSizePx * 0.8, 0)
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-legend-above.png')
})

/** Dots render series by series (Alpha..Golf), five weeks each, so a dot's index is seriesIndex * 5 + weekIndex. */
async function hoverLineDot(page: Page, chart: ReturnType<ReturnType<typeof getStoryFrame>['getByTestId']>, dotIndex: number, offsetY = 0) {
  const box = (await chart.locator('svg circle').nth(dotIndex).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + offsetY)
}

async function countFadedSeries(chart: ReturnType<ReturnType<typeof getStoryFrame>['getByTestId']>) {
  return chart.locator('svg g[opacity]').evaluateAll(
    (groups) => groups.filter((g) => Number(g.getAttribute('opacity')) < 1).length,
  )
}

test('LineAreaChart/FocusPointOnHover story focuses a lone dot, lists ties, and lists all between dots', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--focus-point-on-hover')
  const frame = getStoryFrame(page)
  const chart = frame.getByTestId('LineAreaChart-focus-point')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg circle')).toHaveCount(35)
  const tooltip = chart.getByTestId('chart-tooltip')

  // Lone dot: Golf, first week (1,100).
  await hoverLineDot(page, chart, 6 * 5 + 0)
  await expect(tooltip).toContainText('Golf')
  await expect(tooltip).toContainText('Week of Oct 18-24')
  await expect(tooltip).toContainText('Score')
  await expect(tooltip).toContainText('1,100')
  await expect(tooltip).not.toContainText('Alpha')
  expect(await countFadedSeries(chart)).toBe(6)
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-focus-lone.png')

  // Exact tie: Charlie and Delta at 900 in the last week.
  await hoverLineDot(page, chart, 2 * 5 + 4)
  await expect(tooltip).toContainText('Week of Nov 15-21')
  await expect(tooltip).toContainText('Charlie')
  await expect(tooltip).toContainText('Delta')
  await expect(tooltip).not.toContainText('Alpha')
  expect(await countFadedSeries(chart)).toBe(5)
  await screenshotStory(page, 'tests/design-system/test-results/story-lineareachart-focus-tie.png')

  // Empty space in a column: 40 px above Golf's third-week dot (outside every dot's touch radius).
  await hoverLineDot(page, chart, 6 * 5 + 2, -40)
  await expect(tooltip).toContainText('Week of Nov 1-7')
  for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf']) {
    await expect(tooltip).toContainText(name)
  }
  expect(await countFadedSeries(chart)).toBe(0)
  expect(await countThickLines(chart)).toBe(0)
})

test('LineAreaChart/FocusPointOnHover story draws the focused line 1.5x thicker', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--focus-point-on-hover')
  const chart = getStoryFrame(page).getByTestId('LineAreaChart-focus-point')
  await expect(chart).toBeVisible()
  expect(await countThickLines(chart)).toBe(0)
  // Lone dot (Golf): one line at 3 = 1.5 x the default 2.
  await hoverLineDot(page, chart, 6 * 5 + 0)
  await expect(chart.getByTestId('chart-tooltip')).toContainText('Golf')
  expect(await countThickLines(chart)).toBe(1)
  // Tie (Charlie and Delta): both lines thick.
  await hoverLineDot(page, chart, 2 * 5 + 4)
  await expect(chart.getByTestId('chart-tooltip')).toContainText('Delta')
  expect(await countThickLines(chart)).toBe(2)
})

test('LineAreaChart/FocusPointWithoutDots story never focuses a hidden dot', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-lineareachart--focus-point-without-dots')
  const chart = getStoryFrame(page).getByTestId('LineAreaChart-focus-no-dots')
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg circle')).toHaveCount(0)
  const svg = chart.locator('svg').first()
  const box = (await svg.boundingBox())!
  // Sweep the first week's column top to bottom, passing over every line's hidden sample.
  for (let y = 4; y < box.height - 4; y += 4) {
    await svg.hover({ position: { x: box.width * 0.15, y } })
    expect(await countFadedSeries(chart)).toBe(0)
  }
  await expect(chart.getByTestId('chart-tooltip')).toContainText('Alpha')
})

/** Line paths (fill="none") drawn at the focused width, 1.5 x the default stroke of 2. */
async function countThickLines(chart: ReturnType<ReturnType<typeof getStoryFrame>['getByTestId']>) {
  return chart.locator('svg path[fill="none"]').evaluateAll(
    (paths) => paths.filter((p) => Number(p.getAttribute('stroke-width')) === 3).length,
  )
}

test('DataTable/Default story renders wallets with sortable headers, bare and card variants', async ({ page }) => {
  // Tall enough that the card variant (wrapped below the bare table) renders
  // within the same full-page iframe capture instead of being cropped out.
  await page.setViewportSize({ width: 1280, height: 1800 })
  await gotoStory(page, 'design-system-primitives-datatable--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('DataTable-default')).toBeVisible()
  const bare = frame.getByTestId('DataTable-wallets-bare')
  const card = frame.getByTestId('DataTable-wallets-card')
  await expect(bare).toBeVisible()
  await expect(card).toBeVisible()
  // formatMetricValue applied to the number column: 1234567 compacts to "1.2M"
  await expect(bare.getByText('1.2M')).toBeVisible()

  // Sort cycle on the sortable "Volume" header: asc -> desc, arrow indicator appears.
  const volumeHeader = bare.getByText('Volume', { exact: true })
  await volumeHeader.click()
  await expect(bare.getByText('▲')).toBeVisible()
  await volumeHeader.click()
  await expect(bare.getByText('▼')).toBeVisible()

  await screenshotStory(page, 'tests/design-system/test-results/story-datatable-default.png')
})

test('DataTable/CompactMetrics story renders reduced padding/font metrics summary', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-datatable--compact-metrics')
  const frame = getStoryFrame(page)
  const table = frame.getByTestId('DataTable-metrics-compact')
  await expect(table).toBeVisible()
  await expect(table.getByText('Daily Claims')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-datatable-compact.png')
})

test('DataTable/EmptyState story renders header with "No data" message', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-datatable--empty-state')
  const frame = getStoryFrame(page)
  const table = frame.getByTestId('DataTable-empty')
  await expect(table).toBeVisible()
  await expect(table.getByText('No data', { exact: true })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-datatable-empty.png')
})

test('DataTable/NullValuesAndRowPress story renders "--" for null cells and fires onRowPress', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-datatable--null-values-and-row-press')
  const frame = getStoryFrame(page)
  const table = frame.getByTestId('DataTable-nulls')
  await expect(table).toBeVisible()
  await expect(table.getByText('--', { exact: true })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-datatable-nulls.png')

  const consoleMessages: string[] = []
  page.on('console', (message) => consoleMessages.push(message.text()))
  await table.getByText('0xNULL...').click()
  await expect.poll(() => consoleMessages.some((text) => text.includes('DataTable row pressed'))).toBe(true)
})

test('DataTable/StressTest story renders 150 rows with sticky header and scroll without crashing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-datatable--stress-test')
  const frame = getStoryFrame(page)
  const table = frame.getByTestId('DataTable-stress')
  await expect(table).toBeVisible()
  await expect(table.getByText('0x00000000')).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-datatable-stress.png')
})

test('DataTable/Stress10Columns story renders all 10 columns', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-datatable--stress-10-columns')
  const frame = getStoryFrame(page)
  const table = frame.getByTestId('DataTable-stress-10-columns')
  await expect(table).toBeVisible()
  await expect(table.getByText('Metric 1', { exact: true })).toBeVisible()
  await expect(table.getByText('Metric 10', { exact: true })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-datatable-stress-10-columns.png')
})

test('DataTable/Stress50Columns story renders all 50 columns without crashing', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-datatable--stress-50-columns')
  const frame = getStoryFrame(page)
  const table = frame.getByTestId('DataTable-stress-50-columns')
  await expect(table).toBeVisible()
  await expect(table.getByText('Metric 50', { exact: true })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-datatable-stress-50-columns.png')
})

test('DataTable/Stress100Columns story renders all 100 columns via horizontal scroll, never truncating a column', async ({ page }) => {
  // Regression guard for the degradation strategy: no column is ever hidden or truncated, so
  // every column header must exist in the DOM (reachable via horizontal scroll) even though
  // only a handful fit in the visible viewport at once.
  await gotoStory(page, 'design-system-primitives-datatable--stress-100-columns')
  const frame = getStoryFrame(page)
  const table = frame.getByTestId('DataTable-stress-100-columns')
  await expect(table).toBeVisible()
  await expect(table.getByText('Metric 1', { exact: true })).toBeVisible()
  await expect(table.getByText('Metric 100', { exact: true })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-datatable-stress-100-columns.png')
})

test('DataTable/Stress1000Rows story renders all 1200 rows with sticky header and scroll without crashing', async ({ page }) => {
  // Documents the known no-virtualization limitation (see story comment): every row is a real,
  // always-mounted DOM node, so both the first and last row must be present regardless of scroll.
  await page.setViewportSize({ width: 1280, height: 700 })
  await gotoStory(page, 'design-system-primitives-datatable--stress-1000-rows')
  const frame = getStoryFrame(page)
  const table = frame.getByTestId('DataTable-stress-1000-rows')
  await expect(table).toBeVisible()
  await expect(table.getByText('0x00000000')).toBeVisible()
  await expect(table.getByText('0x000004af')).toBeVisible() // row 1200 (index 1199), always mounted
  await screenshotStory(page, 'tests/design-system/test-results/story-datatable-stress-1000-rows.png')
})

test('DataTable/Controllable story exposes a working range control for the nested ColumnDef.width', async ({ page }) => {
  // Regression guard: `columns[].width` sits one level too deep for Storybook's docgen to
  // auto-infer a control for, so the story bridges it via a top-level `addressColumnWidthPx`
  // range arg. This asserts that control is a real, live-wired <input type="range">, not an
  // inert JSON blob — dragging it must resize the "Address" column in the rendered table.
  await gotoStory(page, 'design-system-primitives-datatable--controllable')
  const frame = getStoryFrame(page)
  const table = frame.getByTestId('DataTable-controllable')
  await expect(table).toBeVisible()

  const addressColumnCell = table.getByText('Address', { exact: true }).locator('..')
  await expect(addressColumnCell).toHaveJSProperty('offsetWidth', 160)

  // The Controls panel lives in the top-level Storybook document, not the story iframe.
  const widthControl = page.locator('#control-addressColumnWidthPx')
  await expect(widthControl).toHaveAttribute('type', 'range')
  await expect(widthControl).toHaveValue('160')

  await widthControl.evaluate((input: HTMLInputElement) => {
    const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    nativeValueSetter.call(input, '350')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })

  await expect(addressColumnCell).toHaveJSProperty('offsetWidth', 350)
  await screenshotStory(page, 'tests/design-system/test-results/story-datatable-controllable-width.png')
})

// NextTaskModal's own interaction flows (open, dismiss, both navigation modes, the three
// error toasts) are covered by the story file's play() functions. Storybook auto-runs a story's
// play() on every render, including a plain Playwright page.goto (not just under
// `pnpm test:storybook`), so every story with a play() has already finished its interaction by
// the time these tests look at it. Tests for those stories therefore assert the final state the
// play() left behind; the Closed story has no play(), so it is used where a test needs to drive
// the interaction itself.

const NEXT_TASK_CTA_TARGET = 'https://gooddollar.org/stake'

test('NextTaskModal/Closed story renders the harness with the modal hidden', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--closed')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('NextTaskModal-open')).toBeVisible()
  // The Drawer (Tamagui Sheet) stays mounted while closed and is moved off-canvas
  // via transform rather than opacity, so `toBeVisible` (an opacity/display check)
  // would pass even though the card is not on screen — `toBeInViewport` checks the
  // actual rendered position instead.
  await expect(frame.getByTestId('NextTaskModal-closed')).not.toBeInViewport()
  await screenshotStory(page, 'tests/design-system/test-results/story-nexttaskmodal-closed.png')
})

test('NextTaskModal/ShownWithContent story renders the sheet with status, headline, recommendation and CTA', async ({
  page,
}) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--shown-with-content')
  const frame = getStoryFrame(page)
  const card = frame.getByTestId('NextTaskModal-shown')
  await expect(card).toBeVisible()
  await expect(card.getByText('Stake your G$ and earn')).toBeVisible()
  await expect(card.getByText('RECOMMENDED')).toBeVisible()
  await expect(frame.getByText('Claim completed')).toBeVisible()
  await expect(frame.getByText('One good next step')).toBeVisible()
  await expect(frame.getByRole('button', { name: 'Skip for now' })).toBeVisible()
  await screenshotStory(page, 'tests/design-system/test-results/story-nexttaskmodal-shown.png')
})

test('NextTaskModal/ShownWithoutImage story renders the sheet without the image slot', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--shown-without-image')
  const frame = getStoryFrame(page)
  const card = frame.getByTestId('NextTaskModal-no-image')
  await expect(card).toBeVisible()
  await expect(card.getByText('Verify your identity')).toBeVisible()
  await expect(card.getByRole('img')).toHaveCount(0)
  await screenshotStory(page, 'tests/design-system/test-results/story-nexttaskmodal-no-image.png')
})

test('NextTaskModal renders default fallbacks when optional copy fields are omitted', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--shown-without-image')
  const frame = getStoryFrame(page)
  const card = frame.getByTestId('NextTaskModal-no-image')
  await expect(card).toBeVisible()

  // Proves that when headline, supportingCopy, recommendedLabel, and skipLabel
  // are omitted from content and props, they fall back to their default constants,
  // while omitting statusLabel renders no status pill.
  await expect(frame.getByText('One good next step')).toBeVisible()
  await expect(
    frame.getByText(
      'Small actions today create a bigger impact tomorrow. Thanks for being part of GoodDollar.',
    ),
  ).toBeVisible()
  await expect(frame.getByText('RECOMMENDED')).toBeVisible()
  await expect(frame.getByRole('button', { name: 'Skip for now' })).toBeVisible()
  await expect(frame.getByText('Claim completed')).toHaveCount(0)

  // When a label is provided (e.g. in ShownWithContent), the status pill renders.
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--shown-with-content')
  const shownFrame = getStoryFrame(page)
  await expect(shownFrame.getByTestId('NextTaskModal-shown')).toBeVisible()
  await expect(shownFrame.getByText('Claim completed')).toBeVisible()
})

// Mobile, landscape, and desktop viewports: inner scrolling ensures actions stay reachable across all viewports.
const NEXT_TASK_VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 800 },
  { label: 'mobile', width: 375, height: 667 },
  { label: 'landscape', width: 667, height: 375 },
]

/** Check resolved default-preset styles, not just the presence of token references in JSX. */
async function expectNextTaskDesign(card: Locator, headline: Locator, cta: Locator, skip: Locator) {
  for (const side of ['top', 'right', 'bottom', 'left']) {
    await expect(card).toHaveCSS(`padding-${side}`, '16px')
  }
  await expect(card).toHaveCSS('background-color', 'rgb(30, 31, 38)')
  await expect(card).toHaveCSS('border-top-color', 'rgb(77, 77, 77)')
  await expect(card).toHaveCSS('column-gap', '12px')
  await expect(headline).toHaveCSS('font-size', '26px')
  await expect(headline).toHaveCSS('line-height', '32px')
  await expect(headline).toHaveCSS('font-weight', '700')

  const title = card.locator('.is_Heading')
  await expect(title).toHaveCSS('font-size', '17px')
  await expect(title).toHaveCSS('line-height', '22px')
  await expect(title).toHaveCSS('font-weight', '700')
  expect(await title.evaluate((element) => getComputedStyle(element.parentElement!).rowGap)).toBe('8px')
  expect(await headline.evaluate((element) => {
    const header = element.parentElement!.parentElement!
    return { gap: getComputedStyle(header).rowGap, paddingTop: getComputedStyle(header).paddingTop }
  })).toEqual({ gap: '12px', paddingTop: '24px' })

  await expect(card.locator('.is_Text')).toHaveCSS('font-size', '14px')
  await expect(card.locator('.is_Text')).toHaveCSS('line-height', '20px')
  await expect(card.locator('.is_Text')).toHaveCSS('color', 'rgb(204, 204, 204)')
  await expect(card.locator('.is_Badge')).toHaveCSS('border-top-width', '1px')
  await expect(card.locator('.is_Badge')).toHaveCSS('border-top-color', 'rgb(26, 133, 255)')
  await expect(card.locator('.is_Badge')).toHaveCSS('padding-top', '0px')
  await expect(card.locator('.is_BadgeText')).toHaveCSS('font-size', '12px')
  await expect(card.locator('.is_BadgeText')).toHaveCSS('color', 'rgb(26, 133, 255)')

  const primaryFrame = await cta.evaluate((element) => element.tagName === 'A')
    ? cta.locator('.is_Button')
    : cta
  await expect(primaryFrame).toHaveCSS('height', '48px')
  await expect(primaryFrame).toHaveCSS('border-top-left-radius', '20px')
  await expect(primaryFrame).toHaveCSS('background-color', 'rgb(26, 133, 255)')
  await expect(cta.locator('.is_ButtonText')).toHaveCSS('font-size', '14px')
  await expect(cta.locator('.is_ButtonText')).toHaveCSS('line-height', '20px')
  await expect(cta.locator('.is_ButtonText')).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(skip.locator('.is_ButtonText')).toHaveCSS('font-size', '14px')
  await expect(skip.locator('.is_ButtonText')).toHaveCSS('line-height', '20px')
  await expect(skip.locator('.is_ButtonText')).toHaveCSS('color', 'rgb(204, 204, 204)')
}

/** Capture the full header before action reachability checks scroll the content away. */
async function screenshotNextTaskTop(page: Page, headline: Locator, path: string) {
  await headline.scrollIntoViewIfNeeded()
  await headline.evaluate((element) => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const overflow = getComputedStyle(parent).overflowY
      if (overflow === 'auto' || overflow === 'scroll') {
        parent.scrollTop = 0
        break
      }
    }
  })
  await page.screenshot({ path })
}

for (const viewport of NEXT_TASK_VIEWPORTS) {
  test(`NextTaskModal keeps its CTA, skip link and close button accessible at ${viewport.width}x${viewport.height} (${viewport.label})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/iframe.html?id=design-system-primitives-nexttaskmodal--shown-with-content&viewMode=story')
    await page.waitForLoadState('networkidle')

    const card = page.getByTestId('NextTaskModal-shown')
    const cta = page.getByRole('link', { name: 'Explore staking' })
    const skipLink = page.getByRole('button', { name: 'Skip for now' })
    const closeButton = page.getByRole('button', { name: 'Close' })
    const headline = page.getByText('One good next step', { exact: true })

    await expectNextTaskDesign(card, headline, cta, skipLink)
    await expect(page.getByText('Claim completed', { exact: true }).locator('..')).toHaveCSS(
      'background-color', 'rgba(19, 198, 54, 0.15)',
    )
    if (viewport.label === 'landscape') {
      await screenshotNextTaskTop(page, headline, 'tests/design-system/test-results/story-nexttaskmodal-shown-landscape-top.png')
    }

    for (const control of [cta, skipLink, closeButton]) {
      await control.scrollIntoViewIfNeeded()
      await expect(control).toBeInViewport({ ratio: 1 })
      await expect(control).toBeVisible()
      await expect(control).toBeEnabled()
    }
    // The card's own content must not be wider than the viewport.
    const cardWidth = await card.evaluate((element) => element.scrollWidth)
    expect(cardWidth).toBeLessThanOrEqual(viewport.width)

    await page.screenshot({
      path: `tests/design-system/test-results/story-nexttaskmodal-shown-${viewport.label}.png`,
    })
  })
}

const NEXT_TASK_DESIGN_VARIANTS = [
  {
    label: 'no-image',
    storyId: 'shown-without-image',
    testId: 'NextTaskModal-no-image',
    ctaLabel: 'Verify now',
    hasImage: false,
  },
  {
    label: 'design-reference',
    storyId: 'design-reference-copy',
    testId: 'NextTaskModal-design-reference',
    ctaLabel: 'Open Proposal',
    hasImage: true,
  },
  {
    label: 'host-cta',
    storyId: 'navigation-pending-and-retry',
    testId: 'NextTaskModal-pending-retry',
    ctaLabel: 'Explore staking',
    hasImage: true,
  },
]

for (const variant of NEXT_TASK_DESIGN_VARIANTS) {
  for (const viewport of NEXT_TASK_VIEWPORTS) {
    test(`NextTaskModal ${variant.label} preserves design hierarchy and reachable actions at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`/iframe.html?id=design-system-primitives-nexttaskmodal--${variant.storyId}&viewMode=story`)
      if (variant.label === 'host-cta') await page.getByTestId('NextTaskModal-open').click()
      const card = page.getByTestId(variant.testId)
      await expect(card).toBeVisible()
      const headline = page.getByText('One good next step', { exact: true })
      const cta = page.getByRole(variant.label === 'host-cta' ? 'button' : 'link', { name: variant.ctaLabel, exact: true })
      const skip = page.getByRole('button', { name: 'Skip for now', exact: true })
      const close = page.getByRole('button', { name: 'Close', exact: true })
      await expectNextTaskDesign(card, headline, cta, skip)
      if (!variant.hasImage) await expect(card.getByRole('img')).toHaveCount(0)
      if (variant.label !== 'design-reference') await expect(page.getByText('Claim completed', { exact: true })).toHaveCount(0)

      const screenshotPath = `tests/design-system/test-results/story-nexttaskmodal-${variant.label}-${viewport.label}`
      if (viewport.label === 'landscape') await screenshotNextTaskTop(page, headline, `${screenshotPath}-top.png`)
      for (const control of [headline, cta, skip, close]) {
        await control.scrollIntoViewIfNeeded()
        await expect(control).toBeInViewport({ ratio: 1 })
        await expect(control).toBeVisible()
        await expect(control).toBeEnabled()
      }
      const cardBox = await card.boundingBox()
      const ctaBox = await cta.boundingBox()
      expect(cardBox!.width).toBeLessThanOrEqual(viewport.width)
      expect(ctaBox!.width).toBeCloseTo(cardBox!.width, 1)
      await page.screenshot({ path: `${screenshotPath}.png` })
    })
  }
}

test('NextTaskModal Anchor mode: the CTA is a link to ctaTarget and pressing it reports the click and closes', async ({
  page,
}) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--closed')
  const frame = getStoryFrame(page)
  await frame.getByTestId('NextTaskModal-open').click()
  const cta = frame.getByRole('link', { name: 'Explore staking' })
  await expect(cta).toHaveAttribute('href', NEXT_TASK_CTA_TARGET)
  await expect(cta.locator('button')).toHaveCount(0)
  await expect(frame.getByRole('button', { name: 'Explore staking' })).toHaveCount(0)
  // Navigation is blocked at the document level (after React's handler) so the test stays on the page.
  await frame.locator('body').evaluate((body) => {
    body.ownerDocument.addEventListener('click', (event) => {
      if ((event.target as HTMLElement | null)?.closest('a')) event.preventDefault()
    })
  })
  await cta.click()
  await expect(frame.getByTestId('NextTaskModal-last-event')).toHaveText(`clicked:${NEXT_TASK_CTA_TARGET}`)
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('closed')
})

test('NextTaskModal host mode: the handler is called with ctaTarget, the sheet closes, no link is involved', async ({
  page,
}) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--host-navigation')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('NextTaskModal-last-event')).toHaveText(`clicked:${NEXT_TASK_CTA_TARGET}`)
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('closed')
  await expect(frame.getByRole('link', { name: 'Explore staking' })).toHaveCount(0)
})

const NEXT_TASK_ERROR_TOASTS = [
  {
    storyId: 'design-system-primitives-nexttaskmodal--navigation-error',
    description: 'a handler that throws',
    message: 'Could not open this link. Please try again.',
  },
  {
    storyId: 'design-system-primitives-nexttaskmodal--navigation-rejected',
    description: 'a handler that rejects',
    message: 'Could not open this link. Please try again.',
  },
  {
    storyId: 'design-system-primitives-nexttaskmodal--rejected-url',
    description: 'a rejected (non-http) ctaTarget without a handler',
    message: 'This link cannot be opened.',
  },
]

for (const errorCase of NEXT_TASK_ERROR_TOASTS) {
  test(`NextTaskModal shows an error toast and keeps drawer open for ${errorCase.description}`, async ({ page }) => {
    await gotoStory(page, errorCase.storyId)
    const frame = getStoryFrame(page)
    await expect(frame.getByText(errorCase.message)).toBeVisible()
    await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('open')

    // Dismiss still works while error is displayed
    const skipButton = frame.getByRole('button', { name: 'Skip for now' })
    await skipButton.scrollIntoViewIfNeeded()
    await skipButton.click()
    await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('closed')
  })
}

test('NextTaskModal CustomCopy story renders configurable copy overrides', async ({ page }) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--custom-copy')
  const frame = getStoryFrame(page)
  await expect(frame.getByText('Custom Headline Step')).toBeVisible()
  await expect(frame.getByText('Custom supporting message for active community members.')).toBeVisible()
  await expect(frame.getByText('FEATURED')).toBeVisible()
  await expect(frame.getByText('Not now, thanks')).toBeVisible()
  await expect(frame.getByText('Verification complete')).toBeVisible()
})

const NEXT_TASK_LONG_COPY_VARIANTS = [
  {
    label: 'with-image',
    storyId: 'design-system-primitives-nexttaskmodal--realistic-long-copy',
    testId: 'NextTaskModal-long-copy',
    hasImage: true,
  },
  {
    label: 'without-image',
    storyId: 'design-system-primitives-nexttaskmodal--realistic-long-copy-without-image',
    testId: 'NextTaskModal-long-copy-no-image',
    hasImage: false,
  },
]

for (const variant of NEXT_TASK_LONG_COPY_VARIANTS) {
  for (const viewport of NEXT_TASK_VIEWPORTS) {
    test(`NextTaskModal RealisticLongCopy (${variant.label}) keeps headline, CTA and skip accessible at ${viewport.width}x${viewport.height} (${viewport.label})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`/iframe.html?id=${variant.storyId}&viewMode=story`)
      await page.waitForLoadState('domcontentloaded')

      const openButton = page.getByTestId('NextTaskModal-open')
      await expect(openButton).toBeVisible()
      await openButton.click()

      const card = page.getByTestId(variant.testId)
      await expect(card).toBeVisible()
      if (!variant.hasImage) {
        await expect(card.getByRole('img')).toHaveCount(0)
      }

      const headline = page.getByText('Support Community Expansion Proposals', { exact: true })
      const cta = page.getByRole('link', { name: 'Read and vote on Snapshot' })
      const skip = page.getByRole('button', { name: 'Remind me tomorrow' })
      const closeButton = page.getByRole('button', { name: 'Close' })

      await expectNextTaskDesign(card, headline, cta, skip)
      if (viewport.label !== 'desktop') {
        await screenshotNextTaskTop(page, headline,
          `tests/design-system/test-results/story-nexttaskmodal-long-copy-${variant.label}-${viewport.label}-top.png`,
        )
      }

      for (const control of [headline, cta, skip, closeButton]) {
        await control.scrollIntoViewIfNeeded()
        await expect(control).toBeInViewport({ ratio: 1 })
        await expect(control).toBeVisible()
      }
      await expect(cta).toBeEnabled()
      await expect(skip).toBeEnabled()
      await expect(closeButton).toBeEnabled()

      const cardWidth = await card.evaluate((element) => element.scrollWidth)
      expect(cardWidth).toBeLessThanOrEqual(viewport.width)

      await page.screenshot({
        path: `tests/design-system/test-results/story-nexttaskmodal-long-copy-${variant.label}-${viewport.label}.png`,
      })
    })
  }
}

test('NextTaskModal host mode: double-press during pending navigation calls handler once, and retrying after failure succeeds', async ({
  page,
}) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--navigation-pending-and-retry')
  const frame = getStoryFrame(page)
  await frame.getByTestId('NextTaskModal-open').click()
  const cta = frame.getByRole('button', { name: 'Explore staking' })
  await cta.scrollIntoViewIfNeeded()
  await expect(cta).toBeInViewport({ ratio: 1 })
  await expect(cta).toBeVisible()
  await expect(cta).toBeEnabled()

  // Dispatch both presses in a single browser execution so slow runners cannot
  // settle and reset the guard between sequential Playwright clicks.
  await cta.evaluate((button) => {
    ;(button as HTMLElement).click()
    ;(button as HTMLElement).click()
  })

  // Error toast appears after delay, drawer remains open
  await expect(frame.getByText('Could not open this link. Please try again.')).toBeVisible()
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('open')

  // resolveNavigation was only called once despite double press
  const callCountAfterFirstAttempt = await frame.locator('body').evaluate((body) => body.dataset.nextTaskCallCount)
  expect(callCountAfterFirstAttempt).toBe('1')

  // onClicked was only called once for the first attempt
  await expect(frame.getByTestId('NextTaskModal-click-count')).toHaveText('1')

  // Retry after failure: second press succeeds
  await cta.click()
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('closed')
  const callCountAfterRetry = await frame.locator('body').evaluate((body) => body.dataset.nextTaskCallCount)
  expect(callCountAfterRetry).toBe('2')

  // onClicked still has count 1 (one intent counted once despite retry)
  await expect(frame.getByTestId('NextTaskModal-click-count')).toHaveText('1')
})

test('NextTaskModal host mode: stale pending navigation from a closed session does not reset guard, toast, or close reopened modal', async ({
  page,
}) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--stale-navigation-ignored-across-reopen')
  const frame = getStoryFrame(page)

  // Session 1: open and start navigation attempt 1 (left pending)
  await frame.getByTestId('NextTaskModal-open').click()
  const cta = frame.getByRole('button', { name: 'Explore staking' })
  await cta.scrollIntoViewIfNeeded()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(frame.getByTestId('NextTaskModal-call-count')).toHaveText('1')

  // Host closes and reopens modal before attempt 1 settles (session 2)
  await frame.getByTestId('NextTaskModal-host-close').evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('closed')
  await frame.getByTestId('NextTaskModal-open').click()
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('open')

  // Session 2: start navigation attempt 2 (also pending)
  await cta.scrollIntoViewIfNeeded()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(frame.getByTestId('NextTaskModal-call-count')).toHaveText('2')

  // Reject stale attempt 1: must NOT show error toast or unlock CTA for a 3rd call while attempt 2 is pending
  await frame.getByTestId('NextTaskModal-reject-oldest').evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-settled-count')).toHaveText('1')
  await expect(frame.getByText('Could not open this link. Please try again.')).toHaveCount(0)
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('open')
  await cta.evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-call-count')).toHaveText('2')

  // Resolve attempt 2: current session closes cleanly
  await frame.getByTestId('NextTaskModal-resolve-oldest').evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-settled-count')).toHaveText('2')
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('closed')

  // Verify stale fulfillment as well: open session 3, leave attempt 3 pending, close + reopen into session 4,
  // then resolve stale attempt 3 -> session 4 stays open without being closed by attempt 3.
  await frame.getByTestId('NextTaskModal-open').click()
  await cta.scrollIntoViewIfNeeded()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(frame.getByTestId('NextTaskModal-call-count')).toHaveText('3')

  await frame.getByTestId('NextTaskModal-host-close').evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('closed')
  await frame.getByTestId('NextTaskModal-open').click()
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('open')

  await frame.getByTestId('NextTaskModal-resolve-oldest').evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-settled-count')).toHaveText('3')
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('open')

  // Session 4 CTA still works normally once resolved
  await cta.scrollIntoViewIfNeeded()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(frame.getByTestId('NextTaskModal-call-count')).toHaveText('4')
  await frame.getByTestId('NextTaskModal-resolve-oldest').evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-settled-count')).toHaveText('4')
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('closed')
  await expect(frame.getByTestId('NextTaskModal-close-count')).toHaveText('2')

  // Verify unmount invalidation: unmount while attempts 5 & 6 are pending, then settle both -> no toast or onClose call
  await frame.getByTestId('NextTaskModal-open').click()
  await cta.scrollIntoViewIfNeeded()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(frame.getByTestId('NextTaskModal-call-count')).toHaveText('5')

  await frame.getByTestId('NextTaskModal-toggle-mount').evaluate((button) => (button as HTMLElement).click())
  await frame.getByTestId('NextTaskModal-resolve-oldest').evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-settled-count')).toHaveText('5')
  await expect(frame.getByTestId('NextTaskModal-close-count')).toHaveText('2')
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('open')

  await frame.getByTestId('NextTaskModal-toggle-mount').evaluate((button) => (button as HTMLElement).click())
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(frame.getByTestId('NextTaskModal-call-count')).toHaveText('6')
  await frame.getByTestId('NextTaskModal-toggle-mount').evaluate((button) => (button as HTMLElement).click())
  await frame.getByTestId('NextTaskModal-reject-oldest').evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-settled-count')).toHaveText('6')
  await expect(frame.getByText('Could not open this link. Please try again.')).toHaveCount(0)
})

test('NextTaskModal host mode: onClose throwing after successful navigation does not show navigation error toast or reset guard', async ({
  page,
}) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--on-close-throw-after-navigation-success')
  const frame = getStoryFrame(page)

  await frame.getByTestId('NextTaskModal-open').click()
  const cta = frame.getByRole('button', { name: 'Explore staking' })
  await cta.scrollIntoViewIfNeeded()
  await expect(cta).toBeVisible()

  const [pageError] = await Promise.all([page.waitForEvent('pageerror'), cta.click()])
  expect(pageError.message).toContain('host onClose failure')

  await expect(frame.getByTestId('NextTaskModal-call-count')).toHaveText('1')
  await expect(frame.getByTestId('NextTaskModal-close-count')).toHaveText('1')
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('open')
  await expect(frame.getByText('Could not open this link. Please try again.')).toHaveCount(0)

  // Guard stays latched after successful navigation so pressing CTA again does not re-run resolveNavigation
  await cta.evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-call-count')).toHaveText('1')
  await expect(frame.getByTestId('NextTaskModal-close-count')).toHaveText('1')
})

test('NextTaskModal dismissal via Skip link works during pending navigation and late completion is ignored', async ({
  page,
}) => {
  await gotoStory(page, 'design-system-primitives-nexttaskmodal--stale-navigation-ignored-across-reopen')
  const frame = getStoryFrame(page)

  await frame.getByTestId('NextTaskModal-open').click()
  const cta = frame.getByRole('button', { name: 'Explore staking' })
  await cta.scrollIntoViewIfNeeded()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(frame.getByTestId('NextTaskModal-call-count')).toHaveText('1')
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('open')

  // Dismissal via Skip link must proceed immediately despite pending navigation
  const skip = frame.getByRole('button', { name: 'Skip for now' })
  await skip.scrollIntoViewIfNeeded()
  await skip.click()
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('closed')
  await expect(frame.getByTestId('NextTaskModal-close-count')).toHaveText('1')
  await expect(frame.getByTestId('NextTaskModal-last-event')).toHaveText('dismissed:skip-link')

  // Late resolution of attempt 1 does not reopen the modal or call onClose again
  await frame.getByTestId('NextTaskModal-resolve-oldest').evaluate((button) => (button as HTMLElement).click())
  await expect(frame.getByTestId('NextTaskModal-settled-count')).toHaveText('1')
  await expect(frame.getByTestId('NextTaskModal-open-state')).toHaveText('closed')
  await expect(frame.getByTestId('NextTaskModal-close-count')).toHaveText('1')
  await expect(frame.getByText('Could not open this link. Please try again.')).toHaveCount(0)
})
