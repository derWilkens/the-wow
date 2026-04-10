import { expect, test } from '@playwright/test'
import {
  cleanupOrganizationsByNames,
  createTestUser,
  deleteUserByEmail,
  getAccessToken,
  getActiveOrganizationId,
  loginAs,
  requireCredentials,
  workflowSelectionHeading,
  testSuffix,
} from './helpers'

async function createOrganizationViaApi(page: Parameters<typeof test>[0]['page'], name: string) {
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()

  const response = await page.request.post('http://127.0.0.1:3000/organizations', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: { name },
  })

  expect(response.ok()).toBeTruthy()
  return (await response.json()) as { id: string; name: string }
}

test.describe('organization landing', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('guides a fresh user from login to creating the first organization and workflow landing', async ({ page }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const userEmail = `org-landing-create-${suffix}@mailinator.com`
    const userPassword = 'CodexSaaS!2026'
    const organizationName = `Landing Org ${suffix}`

    try {
      await deleteUserByEmail(userEmail)
      await createTestUser(userEmail, userPassword)

      await loginAs(page, userEmail, userPassword)
      await expect(page.getByRole('heading', { name: /Firma anlegen|Create organization/i })).toBeVisible({ timeout: 15_000 })

      await page.getByPlaceholder(/Name der Firma|Organization name/i).fill(organizationName)
      const createResponse = page.waitForResponse(
        (response) => response.url().includes('/organizations') && response.request().method() === 'POST',
        { timeout: 20_000 },
      )
      await page.getByTestId('organization-create-submit').click()
      const response = await createResponse
      expect(response.ok()).toBeTruthy()

      await expect(page.getByText(workflowSelectionHeading)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByPlaceholder(/Name des Arbeitsablaufs|New workspace name/i)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText(`Aktive Firma: ${organizationName}`)).toBeVisible({ timeout: 20_000 })
      await expect.poll(async () => getActiveOrganizationId(page), { timeout: 10_000 }).toBeTruthy()
    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })

  test('lets a user choose an existing organization card and lands on the workflow overview', async ({ page }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const userEmail = `org-landing-select-${suffix}@mailinator.com`
    const userPassword = 'CodexSaaS!2026'
    const organizationAName = `Landing Select A ${suffix}`
    const organizationBName = `Landing Select B ${suffix}`
    let selectedOrganizationId: string | null = null

    try {
      await deleteUserByEmail(userEmail)
      await createTestUser(userEmail, userPassword)

      await loginAs(page, userEmail, userPassword)
      await expect(page.getByRole('heading', { name: /Firma anlegen|Create organization/i })).toBeVisible({ timeout: 15_000 })

      const organizationA = await createOrganizationViaApi(page, organizationAName)
      const organizationB = await createOrganizationViaApi(page, organizationBName)
      selectedOrganizationId = organizationB.id

      await page.reload()
      await expect(page.getByTestId(`organization-select-${organizationA.id}`)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId(`organization-select-${organizationB.id}`)).toBeVisible({ timeout: 20_000 })

      await page.getByTestId(`organization-select-${organizationB.id}`).click()

      await expect(page.getByText(workflowSelectionHeading)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByPlaceholder(/Name des Arbeitsablaufs|New workspace name/i)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText(`Aktive Firma: ${organizationBName}`)).toBeVisible({ timeout: 20_000 })
      await expect.poll(async () => getActiveOrganizationId(page), { timeout: 10_000 }).toBe(organizationB.id)
    } finally {
      await cleanupOrganizationsByNames([organizationAName, organizationBName])
      await deleteUserByEmail(userEmail)
    }
  })
})



