/**
 * inviteRewards.spec.ts — Playwright coverage for the Invite Rewards tab states.
 *
 * Uses the deterministic QA fixtures under
 * `QA/CitizenClaimWidget/Invite Rewards Fixtures` (see
 * `examples/storybook/src/stories/helpers/inviteRewardsStories.tsx`), which mount
 * `InviteRewards` directly against a mocked, hook-backed runtime — no live wallet,
 * RPC, or InviteSDK call is involved, so these are fully deterministic and CI-safe.
 *
 * Running:
 *   pnpm storybook          (in one terminal)
 *   pnpm test:demo          (in another terminal)
 *
 * Screenshot evidence: tests/widgets/citizen-claim-widget/test-results/ccw-06 .. ccw-13
 */
import { test, expect, Page } from '@playwright/test'

function storyUrl(id: string): string {
  return `/iframe.html?id=qa-citizenclaimwidget-invite-rewards-fixtures--${id}&viewMode=story`
}

async function gotoStory(page: Page, id: string): Promise<void> {
  await page.goto(storyUrl(id))
  await page.waitForLoadState('domcontentloaded')
}

// ─── Loading / connection states ────────────────────────────────────────────

test('Invite Rewards shows a loading spinner', async ({ page }) => {
  await gotoStory(page, 'loading')
  // Generous timeout: this is often the first story hit in a run, and Storybook's
  // dev server needs to lazily compile the bundle on a cold first request.
  await expect(page.getByText('Loading invite rewards…')).toBeVisible({ timeout: 20_000 })
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-06-invite-loading.png',
    fullPage: true,
  })
})

test('Invite Rewards prompts to connect when disconnected', async ({ page }) => {
  await gotoStory(page, 'disconnected')
  await expect(page.getByText('Connect your wallet to view invite rewards.')).toBeVisible()
})

test('Invite Rewards flags an unsupported network', async ({ page }) => {
  await gotoStory(page, 'unsupported')
  await expect(
    page.getByText('Invite rewards are available on Celo and XDC. Switch networks to continue.'),
  ).toBeVisible()
})

test('Invite Rewards shows a hard error with retry when the initial load fails', async ({ page }) => {
  await gotoStory(page, 'error-no-data')
  await expect(page.getByText(/unable to reach the network/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-07-invite-error.png',
    fullPage: true,
  })
})

// ─── Counts, labels, and empty state ────────────────────────────────────────

test('Invite Rewards empty state offers code creation and hides the invitee list, mirroring GoodWallet', async ({
  page,
}) => {
  await gotoStory(page, 'empty')
  await expect(page.getByText('Create your invite code')).toBeVisible()
  await expect(page.getByText('Total rewards earned')).toBeVisible()
  await expect(page.getByText('0.00 G$', { exact: true })).toBeVisible()
  // With zero invitees, GoodWallet omits the invitee-list section entirely
  // rather than showing an empty "0 approved / 0 pending" breakdown.
  await expect(page.getByText('Your invite rewards')).toHaveCount(0)
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-16-invite-empty-state.png',
    fullPage: true,
  })
})

test('Invite Rewards labels approved/pending/collectable using protocol values, not raw invitee count', async ({
  page,
}) => {
  await gotoStory(page, 'collectable')

  // 3 invitees total (getInvitees), but only 1 is protocol-approved (totalApprovedInvites) —
  // the widget must not conflate "registered" with "approved".
  await expect(page.getByText('3 invitees joined')).toBeVisible()
  await expect(page.getByText('1 approved')).toBeVisible()
  await expect(page.getByText(/2 pending \(1 collectable now\)/)).toBeVisible()
  await expect(page.getByText('Total rewards')).toBeVisible()
  await expect(page.getByText('50.00 G$', { exact: true })).toBeVisible()

  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-08-invite-collectable.png',
    fullPage: true,
  })
})

test('Invite Rewards shows per-invitee waiting vs ready-to-collect status', async ({ page }) => {
  await gotoStory(page, 'pending-only')
  await expect(page.getByRole('button', { name: /collect eligible rewards/i })).toBeDisabled()
  await expect(page.getByText(/waiting for identity verification/i)).toBeVisible()
  await expect(page.getByText('Ready to collect')).toHaveCount(0)
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-09-invite-pending-only.png',
    fullPage: true,
  })
})

// ─── Persistent feedback ─────────────────────────────────────────────────────

test('Invite Rewards keeps the join success banner visible after the join card disappears', async ({
  page,
}) => {
  await gotoStory(page, 'join-success-after-card-hidden')
  await expect(page.getByText('Joined inviter successfully.')).toBeVisible()
  await expect(page.getByText('Have an invite code?')).toHaveCount(0)
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-10-invite-join-success.png',
    fullPage: true,
  })
})

test('Invite Rewards keeps the collection success banner visible', async ({ page }) => {
  await gotoStory(page, 'collect-success')
  await expect(page.getByText('Invite rewards collected successfully.')).toBeVisible()
})

test('Invite Rewards surfaces a collection error inline in the ready view', async ({ page }) => {
  await gotoStory(page, 'collect-error')
  await expect(page.getByText('Invite transaction failed. Please retry.')).toBeVisible()
  // A mutation error must not replace the whole view with the hard error screen —
  // cached counts/cards stay visible alongside the inline error banner.
  await expect(page.getByText('Your invite rewards')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-11-invite-collect-error.png',
    fullPage: true,
  })
})

// ─── Deferred-inviter and collection-ready action paths (deterministic) ────

// Note: these two tests drive the interaction themselves, so they target the plain
// static fixture ('collectable') rather than the same-named QA story that carries its
// own Storybook `play` function — that play function auto-runs on iframe mount and is
// exercised separately by `pnpm test:storybook`. Pointing Playwright at the same story
// would race two independent action executions against one mock runtime instance.
test('Deferred-inviter join flow: enter a code, join, and see persistent success', async ({ page }) => {
  await gotoStory(page, 'collectable')
  await expect(page.getByText('Have an invite code?')).toBeVisible()

  await page.getByPlaceholder('Invite code').fill('friendcode123')
  await page.getByRole('button', { name: /join with code/i }).click()

  await expect(page.getByText('Joined inviter successfully.')).toBeVisible()
  await expect(page.getByText('Have an invite code?')).toHaveCount(0)
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-12-invite-deferred-join-flow.png',
    fullPage: true,
  })
})

test('Collection-ready flow: collect only removes the eligible invitee', async ({ page }) => {
  await gotoStory(page, 'collectable')

  const collectButton = page.getByRole('button', { name: /collect eligible rewards/i })
  await expect(collectButton).toBeEnabled()
  await expect(page.getByText('Ready to collect')).toBeVisible()

  await collectButton.click()

  await expect(page.getByText('Invite rewards collected successfully.')).toBeVisible()
  await expect(page.getByRole('button', { name: /collect eligible rewards/i })).toBeDisabled()
  // The still-waiting invitee remains visible and untouched.
  await expect(page.getByText(/waiting for identity verification/i)).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-13-invite-collection-ready-flow.png',
    fullPage: true,
  })
})

// ─── How it works drawer ─────────────────────────────────────────────────────

test('How it works opens in a Drawer, mirroring GoodWallet, rather than showing inline', async ({
  page,
}) => {
  await gotoStory(page, 'collectable')

  // Not shown inline until the drawer is opened.
  await expect(page.getByText('Share your code.')).toHaveCount(0)

  await page.getByRole('button', { name: 'How it works' }).click()
  await expect(page.getByText('1. Share your code.')).toBeVisible()
  await expect(page.getByText(/2\. Your friend joins and claims\./)).toBeVisible()
  const closeButton = page.getByRole('button', { name: 'Close' })
  await expect(closeButton).toBeVisible()
  await page.waitForTimeout(400) // let the sheet's slide-up animation settle
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-15-invite-how-it-works-drawer.png',
    fullPage: true,
  })

  await closeButton.click()
})

// ─── Mobile layout ───────────────────────────────────────────────────────────

test('Invite Rewards remains usable at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoStory(page, 'collectable')
  await expect(page.getByRole('button', { name: /collect eligible rewards/i })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/citizen-claim-widget/test-results/ccw-14-invite-mobile-collectable.png',
    fullPage: true,
  })
})
