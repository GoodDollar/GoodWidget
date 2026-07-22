import { expect, test, type Page } from '@playwright/test'

const STORY_PREFIX = '/iframe.html?id=qa-citizenclaimwidget-runtime-fixtures--invite-'

test.describe.configure({ timeout: 60_000 })

async function openInviteStory(page: Page, story: string): Promise<void> {
  await page.goto(`${STORY_PREFIX}${story}&viewMode=story`)
  await page.waitForLoadState('domcontentloaded')
  await page.getByText('Invite Rewards', { exact: true }).click()
  await expect(page.getByText('How it works', { exact: true })).toBeVisible()
}

test('ready state uses protocol totals and keeps collection disabled', async ({ page }) => {
  await openInviteStory(page, 'ready')

  await expect(page.getByText('2 approved invites', { exact: true })).toBeVisible()
  await expect(page.getByText('0 pending rewards', { exact: true })).toBeVisible()
  await expect(page.getByText('0 ready to collect', { exact: true })).toBeVisible()
  await expect(page.getByText('Total earned: 15.00 G$', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Collect eligible rewards' })).toBeDisabled()

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-06-invite-ready.png',
    fullPage: true,
  })
})

test('pending state keeps the address and waiting reason visible', async ({ page }) => {
  await openInviteStory(page, 'pending')

  await expect(page.getByText('1 pending reward', { exact: true })).toBeVisible()
  await expect(page.getByText(/0x4444.*Waiting for 7 days and 3 claims/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Collect eligible rewards' })).toBeDisabled()

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-07-invite-pending.png',
    fullPage: true,
  })
})

test('collectable state submits only when ready and leaves waiting invitees pending', async ({
  page,
}) => {
  await openInviteStory(page, 'collectable')

  await expect(page.getByText('2 pending rewards', { exact: true })).toBeVisible()
  await expect(page.getByText('1 ready to collect', { exact: true })).toBeVisible()
  await expect(page.getByText(/0x5555.*Ready to collect/)).toBeVisible()

  const collectButton = page.getByRole('button', { name: 'Collect eligible rewards' })
  await expect(collectButton).toBeEnabled()
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-08-invite-collectable.png',
    fullPage: true,
  })

  await collectButton.click()
  await expect(
    page.getByText('Invite rewards collected successfully.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('1 pending reward', { exact: true })).toBeVisible()
  await expect(page.getByText('0 ready to collect', { exact: true })).toBeVisible()
  await expect(page.getByText(/0x4444.*Waiting for 7 days and 3 claims/)).toBeVisible()
  await expect(page.getByText(/0x5555/)).toHaveCount(0)
})

test('deferred join success remains visible after the join card disappears', async ({ page }) => {
  await openInviteStory(page, 'ready')

  await page.getByPlaceholder('Invite code').fill('FRIEND-42')
  await page.getByRole('button', { name: 'Join with code' }).click()

  await expect(page.getByText('Joined inviter successfully.', { exact: true })).toBeVisible()
  await expect(page.getByText('Have an invite code?', { exact: true })).toHaveCount(0)

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-09-invite-success.png',
    fullPage: true,
  })
})

test('action errors are visible outside the conditional join card', async ({ page }) => {
  await openInviteStory(page, 'error')

  await expect(
    page.getByText('Invite transaction failed. Please retry.', { exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-10-invite-error.png',
    fullPage: true,
  })
})

test('collectable state remains usable at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openInviteStory(page, 'collectable')

  await expect(page.getByText('1 ready to collect', { exact: true })).toBeVisible()
  const collectButton = page.getByRole('button', { name: 'Collect eligible rewards' })
  await expect(collectButton).toBeVisible()
  await collectButton.scrollIntoViewIfNeeded()
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-11-invite-mobile.png',
    fullPage: true,
  })
})
