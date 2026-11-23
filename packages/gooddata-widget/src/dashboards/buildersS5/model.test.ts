import assert from 'node:assert/strict'
import test from 'node:test'

import type { BuildersReport } from './connector.ts'
import type { MetricDefinition } from './metrics.ts'
import {
  buildCardModel,
  collectionStart,
  formatBarLabel,
  formatExact,
  formatShort,
  formatShortDate,
  reportHeadline,
} from './model.ts'

const TX: MetricDefinition = {
  key: 's5_project_tx_count',
  short: 'Transactions',
  name: 'Transactions',
  what: '',
  mind: '',
  unit: 'count',
  asIs: false,
}
const GITHUB: MetricDefinition = {
  key: 'github_commits',
  short: 'GitHub commits',
  name: 'GitHub commits',
  what: '',
  mind: '',
  unit: 'count',
  asIs: false,
  noneRegistered: 'No GitHub repo registered',
}
const WEEK1: MetricDefinition = {
  key: 's5_project_retention_week1',
  short: 'Weekly retention',
  name: 'Weekly retention',
  what: '',
  mind: '',
  unit: 'pct',
  asIs: true,
  firstValueDate: '2026-11-29',
}

function report(status: string, teams: Array<[string, Record<string, number>]>): BuildersReport {
  return { date: '2026-11-15', status, errors: [], teams: teams.map(([name, results]) => ({ name, results })) }
}

test('numbers are written in full below 10,000 and short from 10,000', () => {
  assert.equal(formatShort(9999), '9,999')
  assert.equal(formatShort(10000), '10K')
  assert.equal(formatShort(20300.000056), '20.3K')
  assert.equal(formatShort(1701511.36), '1.7M')
  assert.equal(formatShort(118270), '118.3K')
  assert.equal(formatShort(0), '0')
})

test('G$ amounts and rates carry their unit; a retention rate arrives as 0..1', () => {
  assert.equal(formatBarLabel(20300, 'gd'), 'G$ 20.3K')
  assert.equal(formatBarLabel(55, 'gd'), 'G$ 55')
  assert.equal(formatBarLabel(0.1234, 'pct'), '12.3%')
  assert.equal(formatExact(1701511.36, 'gd'), 'G$ 1,701,511')
})

test('dates are worked out in UTC from the report dates', () => {
  assert.equal(formatShortDate(collectionStart('2026-11-15')), 'Nov 1')
  assert.equal(reportHeadline('2026-11-15', '2026-11-15'), 'Report of Sun, Nov 15, 2026. Totals since Sun, Nov 1, 2026.')
  assert.equal(reportHeadline('2026-11-15', null), 'Report of Sun, Nov 15, 2026.')
})

test('bars are highest first and teams without a value are never drawn as zero', () => {
  const model = buildCardModel(
    TX,
    report('success', [
      ['A', { s5_project_tx_count: 11 }],
      ['B', { s5_project_tx_count: 1972 }],
      ['C', {}],
    ]),
    '2026-11-15',
  )
  assert.equal(model.kind, 'bars')
  if (model.kind !== 'bars') return
  assert.deepEqual(
    model.rows.map((row) => row.team),
    ['B', 'A'],
  )
  assert.equal(model.missingNote, 'Not measured in this report: C')
  assert.equal(model.periodLabel, 'Accumulated since Nov 1, report of Nov 15')
})

test('a team with no account is named with the registry reason after a successful report', () => {
  const model = buildCardModel(
    GITHUB,
    report('success', [
      ['Valor', { github_commits: 24 }],
      ['UbeGames', { s5_project_tx_count: 1972 }],
    ]),
    '2026-11-15',
  )
  assert.equal(model.kind === 'bars' && model.missingNote, 'No GitHub repo registered: UbeGames')
})

test('after a partial report the missing key is not blamed on the registry', () => {
  const model = buildCardModel(
    GITHUB,
    report('partial', [
      ['Valor', { github_commits: 24 }],
      ['UbeGames', {}],
    ]),
    '2026-11-15',
  )
  assert.equal(model.kind === 'bars' && model.missingNote, 'Not measured in this report: UbeGames')
})

test('a retention rate with no value yet says when its first value comes', () => {
  const model = buildCardModel(WEEK1, report('success', [['Valor', { s5_project_tx_count: 1 }]]), '2026-11-15')
  assert.deepEqual(model, { kind: 'placeholder', text: 'First value in the Nov 29 report.' })
})

test('a metric with no value from any team and no first-value date says it is not in the latest report', () => {
  const model = buildCardModel(TX, report('success', [['Valor', {}]]), '2026-11-15')
  assert.deepEqual(model, { kind: 'placeholder', text: 'Not in the latest report (Nov 15).' })
})

test('a snapshot is labelled with the report date only', () => {
  const model = buildCardModel(
    WEEK1,
    report('success', [['Valor', { s5_project_retention_week1: 0.25 }]]),
    '2026-11-15',
  )
  assert.equal(model.kind === 'bars' && model.periodLabel, 'Report of Nov 15')
  assert.equal(model.kind === 'bars' && model.exactNote, null)
})

test('values an abbreviated label hides are listed in full', () => {
  const model = buildCardModel(
    { ...TX, key: 'v', unit: 'gd' },
    report('success', [
      ['Valor', { v: 1701511.364 }],
      ['Blockslide', { v: 55 }],
    ]),
    '2026-11-15',
  )
  assert.equal(model.kind === 'bars' && model.exactNote, 'Exact values: Valor G$ 1,701,511')
})

test('a zero stays a zero bar with its own label', () => {
  const model = buildCardModel(TX, report('success', [['A', { s5_project_tx_count: 0 }]]), '2026-11-15')
  assert.equal(model.kind === 'bars' && model.rows[0].value, 0)
})

test('the first-value message stops once the report is dated on or after that date', () => {
  const lateReport = { ...report('success', [['Valor', { s5_project_tx_count: 1 }]]), date: '2026-12-20' }
  const model = buildCardModel(WEEK1, lateReport, '2026-11-15')
  assert.deepEqual(model, { kind: 'placeholder', text: 'Not in the latest report (Dec 20).' })
  const onTheDay = { ...lateReport, date: '2026-11-29' }
  assert.equal(buildCardModel(WEEK1, onTheDay, '2026-11-15').kind, 'placeholder')
  assert.deepEqual(buildCardModel(WEEK1, { ...lateReport, date: '2026-11-22' }, '2026-11-15'), {
    kind: 'placeholder',
    text: 'First value in the Nov 29 report.',
  })
})

test('when no team has the account a metric needs, the registry reason is kept after a successful report', () => {
  const model = buildCardModel(
    GITHUB,
    report('success', [
      ['Valor', { s5_project_tx_count: 1 }],
      ['UbeGames', { s5_project_tx_count: 2 }],
    ]),
    '2026-11-15',
  )
  assert.deepEqual(model, { kind: 'placeholder', text: 'No GitHub repo registered: Valor, UbeGames' })
})

test('when no team has the key after a partial report the wording stays neutral', () => {
  const model = buildCardModel(GITHUB, report('partial', [['Valor', { s5_project_tx_count: 1 }]]), '2026-11-15')
  assert.deepEqual(model, { kind: 'placeholder', text: 'Not in the latest report (Nov 15).' })
})
