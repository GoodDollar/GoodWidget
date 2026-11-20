import assert from 'node:assert/strict'
import test from 'node:test'

import { createBuildersS5Connector, parseReport, parseReportIndex, type FetchLike } from './connector.ts'

const REPORT_JSON = {
  '2026-11-15': {
    Valor: { results: { s5_project_tx_count: 1709, github_commits: 24, note: 'text', bad: Number.NaN } },
    UbeGames: { results: { s5_project_tx_count: 1972 } },
    Broken: { somethingElse: true },
  },
  _meta: { status: 'success', errors: [] },
}

/** A fetch stand-in that answers from a table and records every URL and method it was asked for. */
function fakeFetch(answers: Record<string, { status?: number; body?: unknown }>) {
  const calls: Array<{ url: string; method: string }> = []
  // The connector's fetch takes only a URL, so every request it makes is a plain GET.
  const impl: FetchLike = async (url) => {
    calls.push({ url, method: 'GET' })
    const answer = answers[url]
    if (!answer) throw new Error(`network down for ${url}`)
    const status = answer.status ?? 200
    return { ok: status >= 200 && status < 300, status, json: async () => answer.body }
  }
  return { impl, calls }
}

test('the report index is sorted, de-duplicated and drops anything that is not an ISO date', () => {
  assert.deepEqual(
    parseReportIndex({ startDate: '2026-11-15', reports: ['2026-11-22', '2026-11-15', '2026-11-15', 'nope', 7] }),
    ['2026-11-15', '2026-11-22'],
  )
})

test('a report index without a reports list is rejected', () => {
  assert.throws(() => parseReportIndex({ startDate: '2026-11-15' }))
  assert.throws(() => parseReportIndex(null))
})

test('a report keeps only finite numbers and only teams that have results', () => {
  const report = parseReport('2026-11-15', REPORT_JSON)
  assert.equal(report.status, 'success')
  assert.deepEqual(report.errors, [])
  assert.deepEqual(
    report.teams.map((team) => team.name),
    ['Valor', 'UbeGames'],
  )
  assert.deepEqual(report.teams[0].results, { s5_project_tx_count: 1709, github_commits: 24 })
})

test('a report with no status reads as "unknown", not as success', () => {
  const report = parseReport('2026-11-15', { '2026-11-15': {} })
  assert.equal(report.status, 'unknown')
})

test('a report whose dated block is missing is rejected', () => {
  assert.throws(() => parseReport('2026-11-22', REPORT_JSON))
})

test('the connector loads the latest report and reads only the two read endpoints', async () => {
  const { impl, calls } = fakeFetch({
    '/gbmetrics/reports': { body: { startDate: '2026-11-15', reports: ['2026-11-15', '2026-11-22'] } },
    '/gbmetrics/getReport?date=2026-11-22': {
      body: { '2026-11-22': { Valor: { results: { s5_project_tx_count: 2000 } } }, _meta: { status: 'partial', errors: ['x'] } },
    },
  })
  const data = await createBuildersS5Connector({ fetchImpl: impl }).fetch()
  assert.equal(data.firstReportDate, '2026-11-15')
  assert.equal(data.report?.date, '2026-11-22')
  assert.equal(data.report?.status, 'partial')
  assert.deepEqual(calls, [
    { url: '/gbmetrics/reports', method: 'GET' },
    { url: '/gbmetrics/getReport?date=2026-11-22', method: 'GET' },
  ])
})

test('no stored reports gives an empty answer without asking for a report', async () => {
  const { impl, calls } = fakeFetch({ '/gbmetrics/reports': { body: { reports: [] } } })
  const data = await createBuildersS5Connector({ fetchImpl: impl }).fetch()
  assert.deepEqual(data, { report: null, firstReportDate: null })
  assert.equal(calls.length, 1)
})

test('a 404 on the selected report is an error, not an empty page', async () => {
  const { impl } = fakeFetch({
    '/gbmetrics/reports': { body: { reports: ['2026-11-15'] } },
    '/gbmetrics/getReport?date=2026-11-15': { status: 404, body: { error: 'report for this date cannot be found' } },
  })
  await assert.rejects(createBuildersS5Connector({ fetchImpl: impl }).fetch(), /404/)
})

test('a network failure is an error', async () => {
  const { impl } = fakeFetch({})
  await assert.rejects(createBuildersS5Connector({ fetchImpl: impl }).fetch(), /network down/)
})

test('the base URL can be changed and a trailing slash is ignored', async () => {
  const { impl, calls } = fakeFetch({ '/api/gb/reports': { body: { reports: [] } } })
  await createBuildersS5Connector({ baseUrl: '/api/gb/', fetchImpl: impl }).fetch()
  assert.equal(calls[0].url, '/api/gb/reports')
})

test('refresh sends nothing', async () => {
  const { impl, calls } = fakeFetch({})
  await createBuildersS5Connector({ fetchImpl: impl }).refresh()
  assert.equal(calls.length, 0)
})
