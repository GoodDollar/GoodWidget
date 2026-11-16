import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type WidgetId = 'citizen-claim' | 'goodreserve' | 'streaming' | 'ai-credits'
type Chunk = { file: string; facadeOwners: WidgetId[]; owners: WidgetId[]; dynamic: boolean }

const labels: Record<WidgetId, string> = {
  'citizen-claim': 'Claim',
  goodreserve: 'Reserve',
  streaming: 'Streaming',
  'ai-credits': 'AI Credits',
}
const versionNames: Record<WidgetId, string> = {
  'citizen-claim': 'Citizen Claim',
  goodreserve: 'GoodReserve',
  streaming: 'Streaming',
  'ai-credits': 'AI Credits',
}
const all = Object.keys(labels) as WidgetId[]

for (const enabled of [
  ['citizen-claim', 'goodreserve'],
  ['streaming', 'ai-credits'],
] as [WidgetId, WidgetId][]) {
  test(`requests ${enabled[0]} on mount and ${enabled[1]} only on selection`, async ({ page }) => {
    const chunks: Chunk[] = JSON.parse(readFileSync(resolve(__dirname, 'dist/widget-chunks.json'), 'utf8'))
    const entries = Object.fromEntries(all.map((id) => {
      const matches = chunks.filter((chunk) => chunk.dynamic && chunk.facadeOwners.includes(id))
      expect(matches, `expected a dynamic entry for ${id}; check the production build`).toHaveLength(1)
      return [id, matches[0].file]
    })) as Record<WidgetId, string>
    const widgetCode = (id: WidgetId) => chunks.filter((chunk) => chunk.owners.includes(id)).map((chunk) => chunk.file)
    for (const id of all) expect(widgetCode(id), `no widget-owned chunk for ${id}`).not.toEqual([])

    const requested = new Set<string>()
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.origin === 'http://127.0.0.1:4178') requested.add(url.pathname.replace(/^\//, ''))
    })
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url())
      return url.origin === 'http://127.0.0.1:4178' ? route.continue() : route.abort()
    })

    await page.goto(`/?widgets=${enabled.join(',')}`)
    const navigation = page.getByRole('navigation')
    await expect(navigation.getByRole('button', { name: labels[enabled[0]], exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => requested.has(entries[enabled[0]])).toBe(true)
    await expect(page.getByText(new RegExp(`^${versionNames[enabled[0]]} v`))).toBeVisible()
    await expect(page.getByText('Unable to load this widget. Please try again later.')).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    for (const id of all.filter((id) => id !== enabled[0])) {
      expect(widgetCode(id).filter((file) => requested.has(file)), `${id} loaded before selection`).toEqual([])
    }

    await navigation.getByRole('button', { name: labels[enabled[1]], exact: true }).click()
    await expect(navigation.getByRole('button', { name: labels[enabled[1]], exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => requested.has(entries[enabled[1]])).toBe(true)
    await expect(page.getByText(new RegExp(`^${versionNames[enabled[1]]} v`))).toBeVisible()
    await expect(page.getByText('Unable to load this widget. Please try again later.')).toHaveCount(0)
    await page.waitForLoadState('networkidle')
    for (const id of all.filter((id) => !enabled.includes(id))) {
      expect(widgetCode(id).filter((file) => requested.has(file)), `disabled ${id} was requested`).toEqual([])
    }
  })
}
