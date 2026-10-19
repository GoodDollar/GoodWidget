#!/usr/bin/env node

/**
 * Show Superfluid campaign points grouped by user and action/event name.
 *
 * Usage:
 *   node points-breakdown.mjs <campaignId>
 *   node points-breakdown.mjs <campaignId> <walletAddress>
 *
 * Examples:
 *   node points-breakdown.mjs 606
 *   node points-breakdown.mjs 606 0x1234567890abcdef1234567890abcdef12345678
 */

const campaignInput = process.argv[2]
const campaignId = Number(campaignInput)
const account = process.argv[3]

if (/^0x[a-fA-F0-9]{40}$/.test(campaignInput ?? '')) {
  console.error(
    'The first argument must be a numeric Points API campaign ID, not a GDA pool address.',
  )
  console.error('For the GoodDollar campaign, use: node points-breakdown.mjs 606 [walletAddress]')
  process.exit(1)
}

if (!Number.isInteger(campaignId) || campaignId <= 0) {
  console.error('Usage: node points-breakdown.mjs <campaignId> [walletAddress]')
  process.exit(1)
}

if (account && !/^0x[a-fA-F0-9]{40}$/.test(account)) {
  console.error('walletAddress must be a valid 0x-prefixed Ethereum address')
  process.exit(1)
}

const endpoint = 'https://cms.superfluid.pro/points/events'
const pageSize = 100
const breakdown = new Map()
let page = 1
let totalEvents = 0

while (true) {
  const url = new URL(endpoint)
  url.searchParams.set('campaignId', String(campaignId))
  url.searchParams.set('limit', String(pageSize))
  url.searchParams.set('page', String(page))
  if (account) url.searchParams.set('account', account)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Points API request failed: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  totalEvents += result.events.length

  for (const event of result.events) {
    // One row per wallet + event name. This exposes both the number of events
    // and the net points awarded for that action.
    const key = `${event.account.toLowerCase()}:${event.eventName}`
    const row = breakdown.get(key) ?? {
      account: event.account.toLowerCase(),
      action: event.eventName,
      eventCount: 0,
      points: 0,
    }

    row.eventCount += 1
    row.points += event.points
    breakdown.set(key, row)
  }

  if (!result.pagination.hasNextPage) break
  page += 1
}

const rows = [...breakdown.values()].sort(
  (left, right) =>
    left.account.localeCompare(right.account) ||
    right.points - left.points ||
    left.action.localeCompare(right.action),
)

console.log(`Campaign ${campaignId}: ${totalEvents} events across ${page} page(s)`)
if (account) console.log(`Account filter: ${account.toLowerCase()}`)

if (rows.length === 0) {
  console.log('No point events found.')
} else {
  console.table(rows)
}
