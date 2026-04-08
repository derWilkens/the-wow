import { expect, type APIRequestContext, type Page, test } from '@playwright/test'
import {
  apiBaseUrl,
  cleanupOrganizationsByNames,
  cleanupTransportModesByLabels,
  cleanupWorkspaces,
  createWorkflow,
  deleteUserByEmail,
  getAccessToken,
  selectFirstEdge,
  signupAndLogin,
  testSuffix,
} from './helpers'

async function ensureWorkspaceList(page: Page, request: APIRequestContext, organizationName: string) {
  const organizationHeading = page.getByRole('heading', { name: /Firma anlegen|Create organization/i })
  if (await organizationHeading.isVisible().catch(() => false)) {
    await page.getByPlaceholder(/Name der Firma|Organization name/i).fill(organizationName)
    const createResponse = page.waitForResponse(
      (response) => response.url().includes('/organizations') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: /^Firma anlegen$|^Create organization$/i }).click()
    await createResponse.catch(async () => {
      const accessToken = await getAccessToken(page)
      await request.post(`${apiBaseUrl}/organizations`, {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
        data: {
          name: organizationName,
        },
      })
      await page.reload()
    })
  }

  await expect(page.getByRole('heading', { name: /Arbeitsablauf ausw|Choose a process workspace/i })).toBeVisible({
    timeout: 15_000,
  })
}

test.describe('transport mode settings', () => {
  test('creates a transport mode in settings and keeps it available after reopening the dialog', async ({ page, request }) => {
    test.setTimeout(90_000)
    const suffix = testSuffix()
    const userEmail = `transport-mode-owner-${suffix}@example.com`
    const userPassword = 'CodexSaaS!2026'
    const organizationName = `Transportmodi Org ${suffix}`
    const workspaceName = `Transportmodus Einstellungen ${suffix}`
    const transportModeLabel = `Teams Nachricht ${suffix}`
    const createdWorkspaceIds: string[] = []

    try {
      await signupAndLogin(page, userEmail, userPassword)
      await ensureWorkspaceList(page, request, organizationName)

      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 15_000 })

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-master-data').click()
      await expect(page.getByRole('heading', { name: 'Firmenkataloge' })).toBeVisible()
      await expect(page.locator('input[value="Direkt"]').first()).toBeVisible()

      await page.getByTestId('settings-transport-mode-new-label').fill(transportModeLabel)
      await page.getByTestId('settings-transport-mode-new-description').fill('Hinweis ueber Teams')
      await page.getByTestId('settings-transport-mode-create').click()
      await expect(page.locator(`input[value="${transportModeLabel}"]`).first()).toBeVisible({ timeout: 15_000 })

      await page.getByTestId('settings-dialog-close').click()
      await expect(page.getByRole('heading', { name: 'Firmenkataloge' })).toHaveCount(0)

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-master-data').click()
      await expect(page.getByRole('heading', { name: 'Firmenkataloge' })).toBeVisible()
      await expect(page.locator(`input[value="${transportModeLabel}"]`).first()).toBeVisible({ timeout: 15_000 })
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, null)
      await cleanupTransportModesByLabels([transportModeLabel])
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })

  test('keeps an already used inactive transport mode visible in edge details', async ({ page, request }) => {
    test.setTimeout(90_000)
    const suffix = testSuffix()
    const userEmail = `transport-mode-inactive-${suffix}@example.com`
    const userPassword = 'CodexSaaS!2026'
    const organizationName = `Transportmodi Inaktiv Org ${suffix}`
    const workspaceName = `Transportmodus Inaktiv ${suffix}`
    const transportModeLabel = `Teams Sync ${suffix}`
    const createdWorkspaceIds: string[] = []

    try {
      await signupAndLogin(page, userEmail, userPassword)
      await ensureWorkspaceList(page, request, organizationName)

      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 15_000 })

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-master-data').click()
      await page.getByTestId('settings-transport-mode-new-label').fill(transportModeLabel)
      await page.getByTestId('settings-transport-mode-new-description').fill('Synchronisation ueber Teams')
      await page.getByTestId('settings-transport-mode-create').click()
      await expect(page.locator(`input[value="${transportModeLabel}"]`).first()).toBeVisible({ timeout: 15_000 })
      await page.getByTestId('settings-dialog-close').click()

      await selectFirstEdge(page)
      await page.getByTestId('edge-transport-mode-trigger').click()
      await page.getByRole('button', { name: new RegExp(transportModeLabel) }).click()
      await page.getByTestId('edge-save').click()

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-master-data').click()
      const modeRow = page.locator(`input[value="${transportModeLabel}"]`).first()
      const modeCard = modeRow.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]').first()
      await modeCard.getByRole('button', { name: 'Deaktivieren' }).click()
      await expect(modeCard).toContainText('inaktiv', { timeout: 15_000 })
      await page.getByTestId('settings-dialog-close').click()

      await selectFirstEdge(page)
      await expect(page.getByTestId('edge-transport-mode-trigger')).toContainText(transportModeLabel)
      await expect(page.getByTestId('edge-transport-status-chip')).toContainText('(inaktiv)')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, null)
      await cleanupTransportModesByLabels([transportModeLabel])
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })
})


