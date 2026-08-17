import { expect, test } from '@playwright/test'

const deepLinkQuery =
  '&buyerAddress=0x1111111111111111111111111111111111111111' +
  `&operatorSignature=0x${'ab'.repeat(64)}`

test('source=antseed renders only the purchase widget, without landing-page sections', async ({
  page,
}) => {
  await page.goto('/?source=antseed')

  await expect(page.getByTestId('ai-credits-purchase-only')).toBeVisible()
  await expect(page.getByTestId('purchase-frame')).toBeVisible()
  await expect(page.getByTestId('ai-credits-landing-page')).toHaveCount(0)
  await expect(page.getByTestId('benefits-strip')).toHaveCount(0)
  await expect(page.getByTestId('agent-skills')).toHaveCount(0)
})

test('omitting source keeps the full landing page unchanged', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('ai-credits-landing-page')).toBeVisible()
  await expect(page.getByTestId('ai-credits-purchase-only')).toHaveCount(0)
})

test('source=antseed composes with buyerAddress and operatorSignature deep-link params', async ({
  page,
}) => {
  await page.goto(`/?source=antseed${deepLinkQuery}`)

  await expect(page.getByTestId('ai-credits-purchase-only')).toBeVisible()
  await expect(page.getByTestId('purchase-frame')).toBeVisible()
  await expect(page.getByTestId('ai-credits-landing-page')).toHaveCount(0)
})
