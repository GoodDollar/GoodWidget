import { expect, test, type Page } from '@playwright/test'

const STORY_IDS = {
  injectedWelcomeUnverified:
    '/iframe.html?id=widgets-governanceonboarding--injected-welcome-unverified&viewMode=story',
  custodialWelcomeUnverified:
    '/iframe.html?id=widgets-governanceonboarding--custodial-welcome-unverified&viewMode=story',
  custodialInteractiveFlow:
    '/iframe.html?id=widgets-governanceonboarding--custodial-interactive-flow&viewMode=story',
  custodialHouseSelection:
    '/iframe.html?id=widgets-governanceonboarding--custodial-house-selection&viewMode=story',
  custodialCitizenshipProfileReady:
    '/iframe.html?id=widgets-governanceonboarding--custodial-citizenship-profile-ready&viewMode=story',
  custodialAlignmentProfileError:
    '/iframe.html?id=widgets-governanceonboarding--custodial-alignment-profile-error&viewMode=story',
  custodialStakeProgress:
    '/iframe.html?id=widgets-governanceonboarding--custodial-stake-progress&viewMode=story',
  custodialSuccess:
    '/iframe.html?id=widgets-governanceonboarding--custodial-success&viewMode=story',
} as const

async function gotoStory(page: Page, storyUrl: string): Promise<void> {
  await page.goto(storyUrl)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle')
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }',
  })
}

async function captureEvidence(page: Page, path: string): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.screenshot({ path, fullPage: true })
      return
    } catch (error: unknown) {
      if (attempt === 3) throw error
      await page.waitForTimeout(attempt * 100)
    }
  }
}

test('Governance onboarding interactive flow persists selected house into profile and success steps', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-07-19T12:00:00Z') })
  await gotoStory(page, STORY_IDS.custodialInteractiveFlow)

  await expect(page.getByText('Welcome', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Proceed to Membership' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: 'Proceed to Membership' })).toBeEnabled()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-01-welcome-verified.png')

  await page.getByRole('button', { name: 'Proceed to Membership' }).click()
  await expect(page.getByText('Choose your house', { exact: true })).toBeVisible()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-02-house-selection.png')

  await page.getByTestId('GovernanceOnboardingWidget-house-alignment').click()
  await page.getByRole('button', { name: 'Continue', exact: true }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Continue', exact: true }).click({ force: true })
  await expect(page.getByText('Apply for House of Alignment', { exact: true })).toBeVisible()
  await expect(page.getByText('Mission statement')).toBeVisible()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-03-profile-alignment.png')

  await page.getByPlaceholder('John Doe or Organization').fill('Solar Commons')
  await page.getByPlaceholder('https://example.com').fill('https://solar.example')
  await page
    .getByPlaceholder(
      'What is the primary goal of your alignment?',
    )
    .fill('Expand regenerative local access.')
  await page
    .getByPlaceholder('How do you plan to allocate resources?')
    .fill('Allocate quarterly grants through community review.')
  await page
    .getByRole('button', { name: 'Create Profile and Stake' })
    .scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Create Profile and Stake' }).click({ force: true })

  await expect(page.getByText('Securing your membership', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Approve governance stake')).toBeVisible()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-04-stake-progress-active.png')

  await page.clock.runFor(1_500)
  await expect(page.getByText('4/4')).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: 'Continue to success' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: 'Continue to success' })).toBeEnabled()
  await page.getByRole('button', { name: 'Continue to success' }).click({ force: true })
  await expect(page.getByText('Welcome to Governance', { exact: true })).toBeVisible()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-05-success.png')
})

test('Governance onboarding shows the unverified welcome state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialWelcomeUnverified)
  await expect(page.getByText('Verification required')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verify with GoodID' })).toBeVisible()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-06-welcome-unverified.png')
})

test('Governance onboarding shows house selection as a standalone state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialHouseSelection)
  await expect(page.getByText('House of Citizenship')).toBeVisible()
  await expect(page.getByText('House of Alignment')).toBeVisible()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-07-house-selection-standalone.png')
})

test('Governance onboarding shows the citizenship profile ready state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialCitizenshipProfileReady)
  await expect(page.getByRole('button', { name: 'Create Profile and Stake' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create Profile and Stake' })).toBeEnabled()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-08-profile-citizenship-ready.png')
})

test('Governance onboarding shows the alignment profile validation state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialAlignmentProfileError)
  await expect(page.getByText('Project webpage is required')).toBeVisible()
  await expect(page.getByText('Distribution strategy is required')).toBeVisible()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-09-profile-alignment-error.png')
})

test('Governance onboarding shows the failed stake progress state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialStakeProgress)
  await expect(page.getByText('Action required')).toBeVisible()
  await expect(
    page.getByText('The previous transaction failed and needs a retry from the wallet.').first(),
  ).toBeVisible()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-10-stake-progress-failed.png')
})

test('Governance onboarding shows the standalone success state actions', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialSuccess)
  await expect(page.getByRole('button', { name: 'Explore Governance Proposals' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Go to my profile' })).toBeVisible()
  await captureEvidence(page, 'tests/widgets/governance-widget/test-results/gwo-11-success-standalone.png')
})

test('Profile field handles rapid typing without losing characters (stale-closure regression)', async ({
  page,
}) => {
  test.slow()
  await gotoStory(page, STORY_IDS.custodialInteractiveFlow)

  await page.getByRole('button', { name: 'Proceed to Membership' }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Proceed to Membership' }).click()
  await page.getByTestId('GovernanceOnboardingWidget-house-alignment').click()
  await page.getByRole('button', { name: 'Continue', exact: true }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Continue', exact: true }).click({ force: true })
  await expect(page.getByText('Apply for House of Alignment', { exact: true })).toBeVisible()

  const nameInput = page.getByPlaceholder('John Doe or Organization')
  const longName = `Solar Commons Federation ${'X'.repeat(60)}`

  await nameInput.click()
  await page.keyboard.type(longName, { delay: 0 })

  await expect(nameInput).toHaveValue(longName)

  const webpageInput = page.getByPlaceholder('https://example.com')
  const longWebpage = `https://${'y'.repeat(40)}.example`
  await webpageInput.click()
  await page.keyboard.type(longWebpage, { delay: 0 })

  await expect(webpageInput).toHaveValue(longWebpage)

  // Multi-line textarea path — exercises ProfileTextAreaField's controlled-value
  // reconciliation, which is the path most likely to drop characters under
  // rapid React Native Web input events.
  const missionArea = page.getByPlaceholder(
    'What is the primary goal of your alignment?',
  )
  const longMission = `Expand regenerative local access. ${'Regenerative '.repeat(20)}`
  await missionArea.scrollIntoViewIfNeeded()
  await missionArea.click({ force: true })
  await page.keyboard.type(longMission, { delay: 0 })

  await expect(missionArea).toHaveValue(longMission)

  // Clear-then-retype path — verifies the controlled-value reconciliation works
  // when the input is overwritten rather than incrementally typed into. This
  // guards against a regression where the stale closure was masked by always
  // typing into an empty field.
  const newMission = 'All new copy after clearing the previous value.'
  await missionArea.fill('')
  await missionArea.scrollIntoViewIfNeeded()
  await missionArea.click({ force: true })
  await page.keyboard.type(newMission, { delay: 0 })
  await expect(missionArea).toHaveValue(newMission)
})
