import { expect, test, type Page } from '@playwright/test'

// This map keeps each test state tied to one Storybook story for visual smoke coverage.
const STORY_IDS = {
  empty: '/iframe.html?id=widgets-stakingmigrationwidget--empty-balance&viewMode=story',
  ready: '/iframe.html?id=widgets-stakingmigrationwidget--ready&viewMode=story',
  wrongNetwork: '/iframe.html?id=widgets-stakingmigrationwidget--wrong-network&viewMode=story',
  approvalPending: '/iframe.html?id=widgets-stakingmigrationwidget--approval-pending&viewMode=story',
  migrating: '/iframe.html?id=widgets-stakingmigrationwidget--migrating&viewMode=story',
  success: '/iframe.html?id=widgets-stakingmigrationwidget--success&viewMode=story',
  error: '/iframe.html?id=widgets-stakingmigrationwidget--error&viewMode=story',
} as const

async function gotoStory(page: Page, storyUrl: string): Promise<void> {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
}

test('StakingMigrationWidget empty balance summary', async ({ page }) => {
  await gotoStory(page, STORY_IDS.empty)
  await expect(page.getByText('No migration available for this wallet yet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'No balance' })).toBeDisabled()
  await page.screenshot({
    path: 'tests/widgets/staking-migration-widget/test-results/smw-01-empty-balance.png',
    fullPage: true,
  })
})

test('StakingMigrationWidget ready summary', async ({ page }) => {
  await gotoStory(page, STORY_IDS.ready)
  await expect(page.getByText('Amount to migrate')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approve & Migrate' })).toBeEnabled()
  await page.screenshot({
    path: 'tests/widgets/staking-migration-widget/test-results/smw-02-ready.png',
    fullPage: true,
  })
})

test('StakingMigrationWidget wrong network notice', async ({ page }) => {
  await gotoStory(page, STORY_IDS.wrongNetwork)
  await expect(page.getByText('Approve on Fuse')).toBeVisible()
  await expect(page.getByText('In progress')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Switch to Fuse' })).toHaveCount(1)
  await page.screenshot({
    path: 'tests/widgets/staking-migration-widget/test-results/smw-03-wrong-network.png',
    fullPage: true,
  })
})

test('StakingMigrationWidget approval pending notice', async ({ page }) => {
  await gotoStory(page, STORY_IDS.approvalPending)
  await expect(page.getByText('Confirm the approval transaction in your wallet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approval pending' })).toBeDisabled()
  await page.screenshot({
    path: 'tests/widgets/staking-migration-widget/test-results/smw-04-approval-pending.png',
    fullPage: true,
  })
})

test('StakingMigrationWidget migrating timeline', async ({ page }) => {
  await gotoStory(page, STORY_IDS.migrating)
  await expect(page.getByText('Migration journey')).toBeVisible()
  await expect(page.getByText('Bridge received')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Migrating' })).toBeDisabled()
  await page.screenshot({
    path: 'tests/widgets/staking-migration-widget/test-results/smw-05-migrating.png',
    fullPage: true,
  })
})

test('StakingMigrationWidget success state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.success)
  await expect(page.getByText('Completed').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refresh balance' })).toHaveCount(1)
  await page.screenshot({
    path: 'tests/widgets/staking-migration-widget/test-results/smw-06-success.png',
    fullPage: true,
  })
})

test('StakingMigrationWidget error state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.error)
  await expect(page.getByText('Failed')).toBeVisible()
  await expect(page.getByText('Bridge finalization timeout')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry migration' })).toHaveCount(1)
  await page.screenshot({
    path: 'tests/widgets/staking-migration-widget/test-results/smw-07-error.png',
    fullPage: true,
  })
})
