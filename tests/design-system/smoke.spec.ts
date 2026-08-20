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
import { test, expect, Page } from '@playwright/test'

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
  // increased card padding/spacing from the golden-ratio spacing pass.
  await page.setViewportSize({ width: 1280, height: 1000 })
  await gotoStory(page, 'design-system-primitives-scorecard--default')
  const frame = getStoryFrame(page)
  await expect(frame.getByTestId('Scorecard-default')).toBeVisible()

  const rowSlugs = ['total-spent', 'ai-credits', 'active-days', 'unique-wallets', 'daily-flow-rate']
  for (const slug of rowSlugs) {
    await expect(frame.getByTestId(`Scorecard-${slug}-bare`)).toBeVisible()
    await expect(frame.getByTestId(`Scorecard-${slug}-card`)).toBeVisible()
  }

  await screenshotStory(page, 'tests/design-system/test-results/story-scorecard-default.png')
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
  await expect(chart.getByText('G$ Price', { exact: true })).toBeVisible()
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
