import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import {
  addUserToOrganization,
  cleanupOrganizationsByNames,
  cleanupWorkspaces,
  createTestUser,
  createWorkflow,
  deleteUserByEmail,
  ensurePostLoginLanding,
  getAccessToken,
  getActivityNodeIds,
  getStartNodeIds,
  loginAs,
  openActivityDetail,
  reopenWorkflowAfterReload,
  requireCredentials,
  saveUiPreferencesViaSettings,
  testSuffix,
} from './helpers'

type SeedUser = {
  email: string
  userId: string
  displayName: string
  domainRoleLabel: string
}

async function createScenarioUserAndOrganization(page: Page, suffix: number) {
  const userEmail = `swimlane-visible-${suffix}@mailinator.com`
  const userPassword = 'CodexSaaS!2026'
  const organizationName = `Swimlane Visible Org ${suffix}`

  await deleteUserByEmail(userEmail).catch(() => Promise.resolve())
  await createTestUser(userEmail, userPassword)
  await loginAs(page, userEmail, userPassword)

  await expect(page.getByRole('heading', { name: /Firma anlegen|Create organization/i })).toBeVisible({ timeout: 20_000 })
  await page.getByPlaceholder(/Name der Firma|Organization name/i).fill(organizationName)
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/organizations') && response.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await page.getByTestId('organization-create-submit').click()
  const response = await responsePromise
  expect(response.ok()).toBeTruthy()
  const createdOrganization = (await response.json()) as { id: string }
  await page.evaluate((organizationId) => {
    window.localStorage.setItem('wow-active-organization-id', organizationId)
  }, createdOrganization.id)
  await page.reload()
  await ensurePostLoginLanding(page, userEmail)

  return { userEmail, userPassword, organizationName, organizationId: createdOrganization.id }
}

async function seedRoleUser(organizationId: string, suffix: number, key: string, displayName: string, domainRoleLabel: string) {
  const email = `${key}-${suffix}@mailinator.com`
  const user = await createTestUser(email, 'CodexSaaS!2026', { displayName, domainRoleLabel })
  await addUserToOrganization(organizationId, user.id, 'member')
  return { email, userId: user.id, displayName, domainRoleLabel } satisfies SeedUser
}

async function readActivity(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  activityId: string,
) {
  const activitiesResponse = await request.get(`http://127.0.0.1:3000/workspaces/${workspaceId}/activities`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(activitiesResponse.ok()).toBeTruthy()
  const activities = (await activitiesResponse.json()) as Array<Record<string, unknown>>
  const activity = activities.find((entry) => entry.id === activityId)
  expect(activity).toBeTruthy()

  return activity!
}

async function createRole(
  request: APIRequestContext,
  accessToken: string,
  organizationId: string,
  label: string,
) {
  const response = await request.post(`http://127.0.0.1:3000/organizations/${organizationId}/roles`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: { label },
  })
  expect(response.ok()).toBeTruthy()
  return (await response.json()) as { id: string; label: string }
}

async function updateActivityRole(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  activityId: string,
  roleId: string,
) {
  const activity = await readActivity(request, accessToken, workspaceId, activityId)

  const upsertResponse = await request.post(`http://127.0.0.1:3000/workspaces/${workspaceId}/activities/upsert`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      id: activity!.id,
      parent_id: activity!.parent_id,
      node_type: activity!.node_type,
      label: activity!.label,
      trigger_type: activity!.trigger_type ?? null,
      position_x: activity!.position_x,
      position_y: activity!.position_y,
      status: activity!.status ?? 'draft',
      status_icon: activity!.status_icon ?? null,
      activity_type: activity!.activity_type ?? null,
      description: activity.description ?? 'Test',
      notes: activity.notes ?? 'Test',
      role_id: roleId,
      duration_minutes: activity.duration_minutes ?? 10,
      linked_workflow_id: activity.linked_workflow_id ?? null,
      linked_workflow_mode: activity.linked_workflow_mode ?? null,
      linked_workflow_purpose: activity.linked_workflow_purpose ?? null,
      linked_workflow_inputs: activity.linked_workflow_inputs ?? [],
      linked_workflow_outputs: activity.linked_workflow_outputs ?? [],
    },
  })
  expect(upsertResponse.ok()).toBeTruthy()
}

async function createConnectedActivity(page: Page, sourceActivityId: string, label: string) {
  const existingIds = await getActivityNodeIds(page)
  await page.getByTestId(`activity-node-${sourceActivityId}`).click()
  await page.getByTestId('toolbar-activity').click()
  await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(existingIds.length + 1)
  const nextId = (await getActivityNodeIds(page)).find((id) => !existingIds.includes(id))
  expect(nextId).toBeTruthy()
  await openActivityDetail(page, nextId!)
  const saveResponse = page.waitForResponse(
    (response) => response.url().includes('/activities/upsert') && response.request().method() === 'POST' && response.status() === 201,
  )
  await page.getByTestId('activity-detail-label').fill(label)
  await page.getByTestId('activity-detail-save').click()
  await saveResponse
  return nextId!
}

test.describe('swimlane visible roles', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('renders lanes only for roles that are visible on the current canvas', async ({ page, request }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const workflowName = `Visible Roles ${suffix}`
    const createdWorkspaceIds: string[] = []
    const createdOrganizationNames: string[] = []
    const createdUserEmails: string[] = []
    let accessToken: string | null = null

    try {
      const scenario = await createScenarioUserAndOrganization(page, suffix)
      createdOrganizationNames.push(scenario.organizationName)
      createdUserEmails.push(scenario.userEmail)

      const bimUser = await seedRoleUser(scenario.organizationId, suffix, 'visible-bim', 'AG BIM-Koordinator', 'BIM-Koordination')
      const architectUser = await seedRoleUser(scenario.organizationId, suffix, 'visible-architect', 'AN Architekt', 'Architektur')
      const tgaUser = await seedRoleUser(scenario.organizationId, suffix, 'visible-tga', 'AN Fachplaner TGA', 'TGA')
      createdUserEmails.push(bimUser.email, architectUser.email, tgaUser.email)

      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getStartNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      const firstActivityId = (await getActivityNodeIds(page))[0]
      const secondActivityId = await createConnectedActivity(page, firstActivityId, 'Architektur bearbeiten')

      const bimRole = await createRole(request, accessToken!, scenario.organizationId, 'BIM-Koordination')
      const architectureRole = await createRole(request, accessToken!, scenario.organizationId, 'Architektur')
      await createRole(request, accessToken!, scenario.organizationId, 'TGA')

      await updateActivityRole(request, accessToken!, workflow.id, firstActivityId, bimRole.id)
      await updateActivityRole(request, accessToken!, workflow.id, secondActivityId, architectureRole.id)

      await expect(page.getByTestId(`activity-node-${firstActivityId}`)).toBeVisible({ timeout: 20_000 })

      await saveUiPreferencesViaSettings(page, { enable_swimlane_view: true })
      await reopenWorkflowAfterReload(page, workflow.id, scenario.userEmail)
      await page.getByTestId('toolbar-grouping-toggle').click()
      await expect(page.getByTestId('role-lane-BIM-Koordination')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('role-lane-Architektur')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('role-lane-TGA')).toHaveCount(0)

      await page.getByTestId('toolbar-grouping-toggle').click()
      await expect(page.getByTestId(`activity-role-${firstActivityId}`)).toContainText('BIMK')
      await expect(page.getByTestId(`activity-role-${secondActivityId}`)).toContainText('A')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupOrganizationsByNames(createdOrganizationNames)
      for (const email of createdUserEmails) {
        await deleteUserByEmail(email).catch(() => Promise.resolve())
      }
    }
  })
})




