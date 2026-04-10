import { expect, test } from '@playwright/test'
import {
  cleanupITToolsByNames,
  cleanupOrganizationsByNames,
  cleanupTransportModesByLabels,
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getActivityNodeIds,
  loginAs,
  openActivityDetail,
  selectEdgeByConnection,
  testSuffix,
  workflowSelectionHeading,
} from './helpers'

const settingsUserEmail = '2@derwilkens.de'
const settingsUserPassword = 'Wilkens:)'
const settingsApiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000'
const requestTimeoutMs = 5_000
const cleanupTimeoutMs = 5_000

async function runCleanupSafely(task: () => Promise<void>) {
  await Promise.race([
    task().catch(() => undefined),
    new Promise<void>((resolve) => {
      setTimeout(resolve, cleanupTimeoutMs)
    }),
  ])
}

async function loginForSettings(page: Parameters<typeof test>[0]['page']) {
  await loginAs(page, settingsUserEmail, settingsUserPassword)
  await Promise.race([
    page.getByRole('heading', { name: /Firma ausw|Firma anlegen/i }).waitFor({ state: 'visible', timeout: 20_000 }),
    page.getByRole('heading', { name: /Arbeitsablauf ausw/i }).waitFor({ state: 'visible', timeout: 20_000 }),
    page.getByTestId('toolbar-activity').waitFor({ state: 'visible', timeout: 20_000 }),
  ])
  await expect.poll(async () => getAccessToken(page), { timeout: 20_000 }).toBeTruthy()
}

async function createOrganizationForSession(page: Parameters<typeof test>[0]['page'], organizationName: string) {
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()

  const response = await page.request.post(`${process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000'}/organizations`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      name: organizationName,
    },
  })

  expect(response.ok()).toBeTruthy()
  const organization = (await response.json()) as { id: string; name: string; membership_role: 'owner' | 'admin' | 'member' }

  await page.evaluate((organizationId) => {
    window.localStorage.setItem('wow-active-organization-id', organizationId)
  }, organization.id)
  await page.reload()
  const organizationCard = page.getByTestId(`organization-select-${organization.id}`)
  await expect(organizationCard).toBeVisible({ timeout: 20_000 })
  await organizationCard.click()
  await expect(page.getByText(workflowSelectionHeading)).toBeVisible({ timeout: 20_000 })

  return organization
}

test.describe('settings and master data', () => {
  test('manages company name, roles, IT tools and transport modes from the central settings dialog', async ({ page, request }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const organizationName = `Settings Org ${suffix}`
    const renamedOrganizationName = `Settings Org Neu ${suffix}`
    const workflowName = `Settings Workflow ${suffix}`
    const roleLabel = `BIM-Koordination ${suffix}`
    const itToolName = `Revit ${suffix}`
    const transportModeLabel = `Teams Sync ${suffix}`
    const assigneeLabel = `AG BIM-Koordinator ${suffix}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null
    let activityRoleId: string | null = null

    try {
      await loginForSettings(page)
      const organization = await createOrganizationForSession(page, organizationName)
      accessToken = await getAccessToken(page)

      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)
      await expect(page.getByTestId('toolbar-settings')).toBeVisible({ timeout: 20_000 })
      let seededEdge: { id: string; from_node_id: string; to_node_id: string } | undefined

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-company-name').fill(renamedOrganizationName)
      await page.getByTestId('settings-company-save').click()
      await expect(page.getByTestId('settings-company-name')).toHaveValue(renamedOrganizationName)
      await page.getByTestId('settings-nav-ui').click()
      await page.getByTestId('settings-ui-grouping-lanes').click()
      await page.getByTestId('settings-ui-save').click()
      await page.getByTestId('settings-nav-master-data').click()

      await page.getByTestId('settings-role-new-label').fill(roleLabel)
      await page.getByTestId('settings-role-new-description').fill('Koordiniert die BIM-Runde')
      await page.getByTestId('settings-role-create').click()
      await expect(page.locator(`input[value="${roleLabel}"]`).first()).toBeVisible({ timeout: 15_000 })

      await page.getByTestId('settings-it-tool-new-name').fill(itToolName)
      await page.getByTestId('settings-it-tool-new-description').fill('BIM Authoring')
      await page.getByTestId('settings-it-tool-create').click()
      await expect(page.locator(`input[value="${itToolName}"]`).first()).toBeVisible({ timeout: 15_000 })

      await page.getByTestId('settings-transport-mode-new-label').fill(transportModeLabel)
      await page.getByTestId('settings-transport-mode-new-description').fill('Koordination ueber Teams')
      await page.getByTestId('settings-transport-mode-create').click()
      await expect(page.locator(`input[value="${transportModeLabel}"]`).first()).toBeVisible({ timeout: 15_000 })

      await page.getByTestId('settings-dialog-close').click()
      await page.getByTestId('toolbar-back-to-workspaces').click()
      await expect(page.getByText(`Aktive Firma: ${renamedOrganizationName}`)).toBeVisible()
      await page.getByTestId(`workspace-open-${workflow.id}`).click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length > 0, { timeout: 20_000 }).toBeTruthy()
      await expect
        .poll(
          async () => {
            const initialEdgesResponse = await page.request.get(`${settingsApiBaseUrl}/workspaces/${workflow.id}/canvas-edges`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              timeout: requestTimeoutMs,
              failOnStatusCode: false,
            })

            if (!initialEdgesResponse.ok()) {
              return null
            }

            const initialEdges = (await initialEdgesResponse.json()) as Array<{
              id: string
              from_node_id: string
              to_node_id: string
            }>

            seededEdge = initialEdges[0]
            return seededEdge ?? null
          },
          { timeout: 20_000 },
        )
        .not.toBeNull()

      const [activityId] = await getActivityNodeIds(page)
      await openActivityDetail(page, activityId)
      await page.getByTestId('activity-assignee-input').fill(assigneeLabel)
      await page.getByTestId('activity-role-select-trigger').click()
      await page.getByRole('button', { name: new RegExp(roleLabel) }).click()
      await page.getByTestId('activity-tool-select-trigger').click()
      await page.getByRole('button', { name: new RegExp(itToolName) }).click()
      await page.getByTestId('activity-tool-link-submit').click()
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toContainText(itToolName)
      const activityDetail = page.getByTestId(`activity-detail-${activityId}`)
      await page.getByTestId('activity-detail-save').click()
      await expect(activityDetail).toHaveCount(0, { timeout: 20_000 })

      await expect
        .poll(
          async () => {
            const persistedActivitiesResponse = await page.request.get(
              `${settingsApiBaseUrl}/workspaces/${workflow.id}/activities`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                timeout: requestTimeoutMs,
                failOnStatusCode: false,
              },
            )

            if (!persistedActivitiesResponse.ok()) {
              return null
            }

            const persistedActivities = (await persistedActivitiesResponse.json()) as Array<{
              id: string
              assignee_label: string | null
              role_id: string | null
            }>

            return persistedActivities.find((entry) => entry.id === activityId) ?? null
          },
          { timeout: 20_000 },
        )
        .toMatchObject({
          assignee_label: assigneeLabel,
        })

      const groupingToggle = page.getByTestId('toolbar-grouping-toggle')
      if ((await page.getByTestId('role-lane-overlay').count()) === 0) {
        await groupingToggle.click()
      }
      await expect(page.getByTestId('role-lane-overlay')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`role-lane-${roleLabel}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`activity-role-${activityId}`)).toHaveCount(0)
      await expect(page.getByTestId(`activity-assignee-${activityId}`)).toHaveCount(0)

      await selectEdgeByConnection(page, seededEdge!.from_node_id, seededEdge!.to_node_id)
      await page.getByTestId('edge-transport-mode-trigger').click()
      await page.getByRole('button', { name: new RegExp(transportModeLabel) }).click()
      await page.getByTestId('edge-save').click()
      await expect(page.getByTestId('edge-transport-mode-trigger')).toContainText(transportModeLabel)

      await page.reload()
      if (await page.getByTestId(`organization-select-${organization.id}`).isVisible({ timeout: 5_000 }).catch(() => false)) {
        await page.evaluate((organizationId) => {
          window.localStorage.setItem('wow-active-organization-id', organizationId)
        }, organization.id)
        await page.reload()
      }
      await Promise.race([
        page.getByRole('heading', { name: /Firma ausw|Select organization/i }).waitFor({ state: 'visible', timeout: 20_000 }),
        page.getByText(workflowSelectionHeading).waitFor({ state: 'visible', timeout: 20_000 }),
        page.getByTestId('toolbar-activity').waitFor({ state: 'visible', timeout: 20_000 }),
      ])

      accessToken = await getAccessToken(page)
      expect(accessToken).toBeTruthy()

      const organizationsResponse = await page.request.get(`${settingsApiBaseUrl}/organizations`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: requestTimeoutMs,
        failOnStatusCode: false,
      })
      expect(organizationsResponse.ok()).toBeTruthy()
      const organizations = (await organizationsResponse.json()) as Array<{ id: string; name: string }>
      expect(organizations.some((entry) => entry.id === organization.id && entry.name === renamedOrganizationName)).toBeTruthy()

      const rolesResponse = await page.request.get(`${settingsApiBaseUrl}/organizations/${organization.id}/roles`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: requestTimeoutMs,
        failOnStatusCode: false,
      })
      expect(rolesResponse.ok()).toBeTruthy()
      const roles = (await rolesResponse.json()) as Array<{ id: string; label: string }>
      activityRoleId = roles.find((role) => role.label === roleLabel)?.id ?? null
      expect(activityRoleId).toBeTruthy()

      const activitiesResponse = await page.request.get(`${settingsApiBaseUrl}/workspaces/${workflow.id}/activities`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: requestTimeoutMs,
        failOnStatusCode: false,
      })
      expect(activitiesResponse.ok()).toBeTruthy()
      const persistedActivities = (await activitiesResponse.json()) as Array<{
        id: string
        assignee_label: string | null
        role_id: string | null
      }>
      expect(
        persistedActivities.some(
          (entry) => entry.id === activityId && entry.assignee_label === assigneeLabel && entry.role_id === activityRoleId,
        ),
      ).toBeTruthy()

      const linkedToolsResponse = await page.request.get(
        `${settingsApiBaseUrl}/workspaces/${workflow.id}/activities/${activityId}/tools`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: requestTimeoutMs,
          failOnStatusCode: false,
        },
      )
      expect(linkedToolsResponse.ok()).toBeTruthy()
      const linkedTools = (await linkedToolsResponse.json()) as Array<{ id: string; name: string }>
      expect(linkedTools.some((tool) => tool.name === itToolName)).toBeTruthy()

      const transportModesResponse = await page.request.get(
        `${settingsApiBaseUrl}/organizations/${organization.id}/transport-modes`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: requestTimeoutMs,
          failOnStatusCode: false,
        },
      )
      expect(transportModesResponse.ok()).toBeTruthy()
      const transportModes = (await transportModesResponse.json()) as Array<{ id: string; label: string }>
      expect(transportModes.some((mode) => mode.label === transportModeLabel)).toBeTruthy()
    } finally {
      await runCleanupSafely(() => cleanupWorkspaces(request, createdWorkspaceIds, accessToken))
      await runCleanupSafely(() => cleanupITToolsByNames([itToolName]))
      await runCleanupSafely(() => cleanupTransportModesByLabels([transportModeLabel]))
      await runCleanupSafely(() => cleanupOrganizationsByNames([organizationName, renamedOrganizationName]))
    }
  })
})

