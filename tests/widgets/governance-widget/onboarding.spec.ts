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
}

test('Governance onboarding interactive flow persists selected house into profile and success steps', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.custodialInteractiveFlow)

  await expect(page.getByText('Join GoodDollar governance')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue to house selection' })).toBeEnabled()
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-01-welcome-verified.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: 'Continue to house selection' }).click()
  await expect(page.getByText('Select your governance house')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-02-house-selection.png',
    fullPage: true,
  })

  await page.getByTestId('GovernanceOnboardingWidget-house-alignment').click()
  await page.getByRole('button', { name: 'Continue to profile' }).click()
  await expect(page.getByText('House of Alignment profile', { exact: true })).toBeVisible()
  await expect(page.getByText('Mission statement')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-03-profile-alignment.png',
    fullPage: true,
  })

  await page.getByPlaceholder('Describe the member or project name').fill('Solar Commons')
  await page.getByPlaceholder('https://goodproject.example').fill('https://solar.example')
  await page
    .getByPlaceholder(
      'Explain the mission that aligns the project with the GoodDollar ecosystem.',
    )
    .fill('Expand regenerative local access.')
  await page
    .getByPlaceholder('Describe how governance-approved funding will be allocated.')
    .fill('Allocate quarterly grants through community review.')
  await page.getByRole('button', { name: /continue/i }).click()

  await expect(page.getByText('Track the membership stake journey')).toBeVisible()
  await expect(page.getByText('Approve governance stake')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-04-stake-progress-active.png',
    fullPage: true,
  })

  await page.getByRole('button', { name: 'Continue to success' }).click()
  await expect(page.getByText('Governance onboarding complete')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-05-success.png',
    fullPage: true,
  })
})

test('Governance onboarding shows the unverified welcome state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialWelcomeUnverified)
  await expect(page.getByText('Verification required')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue to house selection' })).toBeDisabled()
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-06-welcome-unverified.png',
    fullPage: true,
  })
})

test('Governance onboarding shows house selection as a standalone state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialHouseSelection)
  await expect(page.getByText('House of Citizenship')).toBeVisible()
  await expect(page.getByText('House of Alignment')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-07-house-selection-standalone.png',
    fullPage: true,
  })
})

test('Governance onboarding shows the citizenship profile ready state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialCitizenshipProfileReady)
  await expect(page.getByText('Ready to continue')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue to stake flow' })).toHaveCount(1)
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-08-profile-citizenship-ready.png',
    fullPage: true,
  })
})

test('Governance onboarding shows the alignment profile validation state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialAlignmentProfileError)
  await expect(page.getByText('Project webpage is required')).toBeVisible()
  await expect(page.getByText('Distribution strategy is required')).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-09-profile-alignment-error.png',
    fullPage: true,
  })
})

test('Governance onboarding shows the failed stake progress state', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialStakeProgress)
  await expect(page.getByText('Action required')).toBeVisible()
  await expect(
    page.getByText('The previous transaction failed and needs a retry from the wallet.').first(),
  ).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-10-stake-progress-failed.png',
    fullPage: true,
  })
})

test('Governance onboarding shows the standalone success state actions', async ({ page }) => {
  await gotoStory(page, STORY_IDS.custodialSuccess)
  await expect(page.getByRole('button', { name: 'Open governance dashboard' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review proposal queue' })).toBeVisible()
  await page.screenshot({
    path: 'tests/widgets/governance-widget/test-results/gwo-11-success-standalone.png',
    fullPage: true,
  })
})

test('Profile field handles rapid typing without losing characters (stale-closure regression)', async ({
  page,
}) => {
  await gotoStory(page, STORY_IDS.custodialInteractiveFlow)

  await page.getByRole('button', { name: 'Continue to house selection' }).click()
  await page.getByTestId('GovernanceOnboardingWidget-house-alignment').click()
  await page.getByRole('button', { name: 'Continue to profile' }).click()
  await expect(page.getByText('House of Alignment profile', { exact: true })).toBeVisible()

  const nameInput = page.getByPlaceholder('Describe the member or project name')
  const longName = `Solar Commons Federation ${'X'.repeat(60)}`

  await nameInput.click()
  await page.keyboard.type(longName, { delay: 0 })

  await expect(nameInput).toHaveValue(longName)

  const webpageInput = page.getByPlaceholder('https://goodproject.example')
  const longWebpage = `https://${'y'.repeat(40)}.example`
  await webpageInput.click()
  await page.keyboard.type(longWebpage, { delay: 0 })

  await expect(webpageInput).toHaveValue(longWebpage)

  // Multi-line textarea path — exercises ProfileTextAreaField's controlled-value
  // reconciliation, which is the path most likely to drop characters under
  // rapid React Native Web input events.
  const missionArea = page.getByPlaceholder(
    'Explain the mission that aligns the project with the GoodDollar ecosystem.',
  )
  const longMission = `Expand regenerative local access. ${'Regenerative '.repeat(40)}`
  await missionArea.click()
  await page.keyboard.type(longMission, { delay: 0 })

  await expect(missionArea).toHaveValue(longMission)

  // Clear-then-retype path — verifies the controlled-value reconciliation works
  // when the input is overwritten rather than incrementally typed into. This
  // guards against a regression where the stale closure was masked by always
  // typing into an empty field.
  const newMission = 'All new copy after clearing the previous value.'
  await missionArea.fill('')
  await missionArea.click()
  await page.keyboard.type(newMission, { delay: 0 })
  await expect(missionArea).toHaveValue(newMission)
})
