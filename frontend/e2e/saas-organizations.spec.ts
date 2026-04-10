import { expect, test } from '@playwright/test'
import {
  cleanupOrganizationsByNames,
  createTestUser,
  createWorkflow,
  deleteUserByEmail,
  getAccessToken,
  getActiveOrganizationId,
  getActivityNodeIds,
  loginAs,
  logout,
  openActivityDetail,
  signupAndLogin,
  workflowSelectionHeading,
  workspacesButton,
  testSuffix,
} from './helpers'

test.describe('saas organizations', () => {
  test('supports self-service signup, organization creation, and the first workflow', async ({ page }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const userEmail = `saas-owner-${suffix}@mailinator.com`
    const userPassword = 'CodexSaaS!2026'
    const organizationName = `Mandant Alpha ${suffix}`
    const workflowName = `Onboarding Ablauf ${suffix}`

    try {
      await deleteUserByEmail(userEmail)

      await signupAndLogin(page, userEmail, userPassword)
      await expect(page.getByRole('heading', { name: /Firma anlegen|Firma ausw/i })).toBeVisible()

      await page.getByPlaceholder('Name der Firma').fill(organizationName)
      await page.getByRole('button', { name: /^Firma anlegen$/i }).click()
      await expect(page.getByRole('heading', { name: workflowSelectionHeading })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(`Aktive Firma: ${organizationName}`)).toBeVisible()

      await createWorkflow(page, workflowName)
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 15_000 })
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })

  test.skip('lets an invited member access and edit a shared workflow inside the same organization', async ({ page, request }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const ownerEmail = `saas-shared-owner-${suffix}@example.com`
    const memberEmail = `saas-shared-member-${suffix}@example.com`
    const userPassword = 'CodexSaaS!2026'
    const organizationName = `Mandant Shared ${suffix}`
    const workflowName = `Gemeinsamer Ablauf ${suffix}`
    let workflowId: string | null = null

    try {
      await createTestUser(ownerEmail, userPassword)
      await createTestUser(memberEmail, userPassword)

      await loginAs(page, ownerEmail, userPassword)
      await expect(page.getByRole('heading', { name: /Firma anlegen|Firma ausw/i })).toBeVisible({ timeout: 15_000 })
      await page.getByPlaceholder('Name der Firma').fill(organizationName)
      await page.getByRole('button', { name: /^Firma anlegen$/i }).click()
      await expect(page.getByRole('heading', { name: workflowSelectionHeading })).toBeVisible({ timeout: 15_000 })

      const workflow = await createWorkflow(page, workflowName)
      workflowId = workflow.id
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 15_000 })

      await page.getByRole('button', { name: workspacesButton }).click()
      await expect(page.getByRole('heading', { name: workflowSelectionHeading })).toBeVisible({ timeout: 15_000 })
      const ownerToken = await getAccessToken(page)
      const activeOrganizationId = await getActiveOrganizationId(page)
      expect(ownerToken).toBeTruthy()
      expect(activeOrganizationId).toBeTruthy()

      const inviteResponse = await request.post(`http://127.0.0.1:3000/organizations/${activeOrganizationId}/invitations`, {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          email: memberEmail,
          role: 'member',
        },
      })
      expect(inviteResponse.ok()).toBeTruthy()

      await logout(page)

      await loginAs(page, memberEmail, userPassword)
      await expect(page.getByRole('heading', { name: /Firma anlegen|Firma ausw/i })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(organizationName)).toBeVisible({ timeout: 15_000 })
      await page.getByRole('button', { name: /Einladung annehmen/i }).click()

      await expect(page.getByRole('heading', { name: workflowSelectionHeading })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(`Aktive Firma: ${organizationName}`)).toBeVisible()
      await expect(page.getByTestId(`workspace-card-${workflowId}`)).toBeVisible({ timeout: 15_000 })

      await page.getByTestId(`workspace-open-${workflowId}`).click()
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 15_000 })
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      await page.getByTestId('toolbar-activity').click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(memberEmail)
      await deleteUserByEmail(ownerEmail)
    }
  })

  test('isolates workflows and IT tools between different organizations', async ({ page }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const ownerAEmail = `saas-isolation-a-${suffix}@example.com`
    const ownerBEmail = `saas-isolation-b-${suffix}@example.com`
    const userPassword = 'CodexSaaS!2026'
    const organizationAName = `Mandant A ${suffix}`
    const organizationBName = `Mandant B ${suffix}`
    const workflowAName = `Vertraulicher Ablauf ${suffix}`
    const workflowBName = `Eigener Ablauf ${suffix}`
    const toolName = `SAP Isolation ${suffix}`

    try {
      await createTestUser(ownerAEmail, userPassword)
      await createTestUser(ownerBEmail, userPassword)

      await loginAs(page, ownerAEmail, userPassword)
      await expect(page.getByRole('heading', { name: /Firma anlegen|Firma ausw/i })).toBeVisible({ timeout: 15_000 })
      await page.getByPlaceholder('Name der Firma').fill(organizationAName)
      await page.getByRole('button', { name: /^Firma anlegen$/i }).click()
      await expect(page.getByRole('heading', { name: workflowSelectionHeading })).toBeVisible({ timeout: 15_000 })

      await createWorkflow(page, workflowAName)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [activityAId] = await getActivityNodeIds(page)

      await openActivityDetail(page, activityAId)
      await page.getByTestId('activity-tool-select-trigger').click()
      await page.getByTestId('activity-tool-select-create-toggle').click()
      await page.getByTestId('activity-tool-select-create-name').fill(toolName)
      await page.getByTestId('activity-tool-select-create-submit').click()
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toContainText(toolName)

      await logout(page)

      await loginAs(page, ownerBEmail, userPassword)
      await expect(page.getByRole('heading', { name: /Firma anlegen|Firma ausw/i })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(organizationAName)).toHaveCount(0)
      await page.getByPlaceholder('Name der Firma').fill(organizationBName)
      await page.getByRole('button', { name: /^Firma anlegen$/i }).click()
      await expect(page.getByRole('heading', { name: workflowSelectionHeading })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(workflowAName)).toHaveCount(0)

      await createWorkflow(page, workflowBName)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [activityBId] = await getActivityNodeIds(page)

      await openActivityDetail(page, activityBId)
      await page.getByTestId('activity-tool-select-trigger').click()
      await expect(page.getByTestId('activity-tool-select-panel')).not.toContainText(toolName)
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toHaveCount(0)
    } finally {
      await cleanupOrganizationsByNames([organizationAName, organizationBName])
      await deleteUserByEmail(ownerBEmail)
      await deleteUserByEmail(ownerAEmail)
    }
  })

  test('keeps the selected organization context across a full reload', async ({ page }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const userEmail = `saas-reload-${suffix}@example.com`
    const userPassword = 'CodexSaaS!2026'
    const organizationName = `Mandant Reload ${suffix}`
    const workflowName = `Reload Ablauf ${suffix}`
    let workflowId: string | null = null

    try {
      await createTestUser(userEmail, userPassword)

      await loginAs(page, userEmail, userPassword)
      await expect(page.getByRole('heading', { name: /Firma anlegen|Firma ausw/i })).toBeVisible({ timeout: 15_000 })
      await page.getByPlaceholder('Name der Firma').fill(organizationName)
      await page.getByRole('button', { name: /^Firma anlegen$/i }).click()
      await expect(page.getByRole('heading', { name: workflowSelectionHeading })).toBeVisible({ timeout: 15_000 })

      const workflow = await createWorkflow(page, workflowName)
      workflowId = workflow.id
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 15_000 })

      await page.getByRole('button', { name: workspacesButton }).click()
      await expect(page.getByText(`Aktive Firma: ${organizationName}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`workspace-card-${workflowId}`)).toBeVisible({ timeout: 15_000 })

      await page.reload()
      await expect(page.getByRole('heading', { name: workflowSelectionHeading })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(`Aktive Firma: ${organizationName}`)).toBeVisible()
      await expect(page.getByTestId(`workspace-card-${workflowId}`)).toBeVisible({ timeout: 15_000 })
    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })
})







