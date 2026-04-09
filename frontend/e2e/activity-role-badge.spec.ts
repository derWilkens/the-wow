import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getActiveOrganizationId,
  getActivityNodeIds,
  login,
  openActivityDetail,
  testSuffix,
} from './helpers'

const apiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000'

test.describe('activity role badge', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E credentials are required')

  test('creates a role from the node badge and reflects acronym updates from settings', async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000)
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null
    const suffix = testSuffix()
    const workflowName = `Role Badge ${suffix}`
    const roleLabel = `Projekt-Leiter ${suffix}`
    const updatedAcronym = `P${suffix}`

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const organizationId = await getActiveOrganizationId(page)
      expect(organizationId).toBeTruthy()

      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [activityId] = await getActivityNodeIds(page)

      const roleTrigger = page.getByTestId(`activity-role-trigger-${activityId}`)
      const roleBadge = page.getByTestId(`activity-role-${activityId}`)

      await expect(roleBadge).toHaveText('?')
      await roleTrigger.hover()
      await expect(page.getByTestId(`activity-role-trigger-tooltip-${activityId}`)).toHaveText('Rolle festlegen')

      await roleTrigger.click()
      await expect(page.getByTestId(`activity-role-popover-${activityId}`)).toBeVisible()
      await page.getByTestId(`activity-role-create-name-${activityId}`).fill(roleLabel)
      await page.getByTestId(`activity-role-create-description-${activityId}`).fill('Leitet das Projekt fachlich')

      const createRoleResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/organizations/${organizationId}/roles`) &&
          response.request().method() === 'POST',
      )
      const assignRoleResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/workspaces/${workflow.id}/activities/upsert`) &&
          response.request().method() === 'POST',
      )
      await page.getByTestId(`activity-role-create-submit-${activityId}`).click()
      expect((await createRoleResponse).ok()).toBeTruthy()
      expect((await assignRoleResponse).ok()).toBeTruthy()

      await expect(page.getByTestId(`activity-role-popover-${activityId}`)).toHaveCount(0)
      await expect(roleBadge).toHaveText('PL')

      const rolesResponse = await request.get(`${apiBaseUrl}/organizations/${organizationId}/roles`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      expect(rolesResponse.ok()).toBeTruthy()
      const roles = (await rolesResponse.json()) as Array<{ id: string; label: string; acronym: string }>
      const createdRole = roles.find((entry) => entry.label === roleLabel)
      expect(createdRole).toBeTruthy()
      expect(createdRole?.acronym).toBe('PL')

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-master-data').click()
      const acronymInput = page.getByLabel(`${roleLabel} Akronym`)
      await expect(acronymInput).toBeVisible({ timeout: 15_000 })
      await acronymInput.fill(updatedAcronym)

      const saveRoleResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/organizations/${organizationId}/roles/${createdRole!.id}`) &&
          response.request().method() === 'PATCH',
      )
      await page.getByTestId(`settings-role-save-${createdRole!.id}`).click()
      expect((await saveRoleResponse).ok()).toBeTruthy()

      await page.getByTestId('settings-dialog-close').click()
      await expect(page.getByTestId('settings-dialog-close')).toHaveCount(0)

      await expect
        .poll(async () => {
          const refreshedRolesResponse = await request.get(`${apiBaseUrl}/organizations/${organizationId}/roles`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })
          if (!refreshedRolesResponse.ok()) {
            return null
          }

          const refreshedRoles = (await refreshedRolesResponse.json()) as Array<{
            id: string
            label: string
            acronym: string
          }>
          return refreshedRoles.find((entry) => entry.id === createdRole?.id)?.acronym ?? null
        })
        .toBe(updatedAcronym)

      await login(page)
      const workspaceReopenButton = page.getByTestId(`workspace-open-${workflow.id}`)
      await expect(workspaceReopenButton).toBeVisible({ timeout: 15_000 })
      await workspaceReopenButton.click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBeGreaterThan(0)
      await expect(page.getByTestId(`activity-role-${activityId}`)).toHaveText(updatedAcronym)
      await openActivityDetail(page, activityId)
      await expect(page.getByTestId('activity-role-select-trigger')).toContainText(roleLabel)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
