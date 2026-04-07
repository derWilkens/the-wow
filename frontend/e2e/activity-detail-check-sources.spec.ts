import { expect, test, type Page } from '@playwright/test'
import {
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
  requireCredentials,
  selectEdgeByConnection,
  testSuffix,
} from './helpers'

async function createScenarioUserAndOrganization(page: Page, suffix: number) {
  const userEmail = `activity-check-sources-${suffix}@mailinator.com`
  const userPassword = 'CodexSaaS!2026'
  const organizationName = `Activity Check Sources Org ${suffix}`

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

  return { userEmail, organizationName }
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

async function addEdgeDataObject(
  page: Page,
  workspaceId: string,
  sourceNodeId: string,
  targetNodeId: string,
  objectName: string,
) {
  await selectEdgeByConnection(page, sourceNodeId, targetNodeId)
  await page.getByTestId('edge-add-new-data-object').click()
  const inlineInput = page.locator('[data-testid^="edge-inline-name-"]').last()
  await expect(inlineInput).toBeVisible({ timeout: 15_000 })
  const inputTestId = await inlineInput.getAttribute('data-testid')
  expect(inputTestId).toBeTruthy()
  const createdObjectId = inputTestId!.replace('edge-inline-name-', '')

  await inlineInput.fill(objectName)
  const saveObjectResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/workspaces/${workspaceId}/canvas-objects/upsert`) &&
      response.request().method() === 'POST' &&
      response.status() === 201,
  )
  await page.getByTestId(`edge-inline-save-${createdObjectId}`).click()
  await saveObjectResponse
  await expect(page.getByTestId(`edge-data-object-row-${createdObjectId}`)).toContainText(objectName)
  return createdObjectId
}

test.describe('activity detail check sources', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('shows check-source chips inside the activity detail dialog', async ({ page, request }) => {
    test.setTimeout(180_000)
    const suffix = testSuffix()
    const workflowName = `Check Sources ${suffix}`
    const createdWorkspaceIds: string[] = []
    const createdOrganizationNames: string[] = []
    let scenarioUserEmail: string | null = null
    let accessToken: string | null = null

    try {
      const scenario = await createScenarioUserAndOrganization(page, suffix)
      scenarioUserEmail = scenario.userEmail
      createdOrganizationNames.push(scenario.organizationName)

      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getStartNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      const sourceActivityId = (await getActivityNodeIds(page))[0]
      const targetActivityId = await createConnectedActivity(page, sourceActivityId, 'Pruefung durchfuehren')

      const reportObjectId = await addEdgeDataObject(page, workflow.id, sourceActivityId, targetActivityId, 'Koordinationsbericht')
      const feedbackObjectId = await addEdgeDataObject(page, workflow.id, sourceActivityId, targetActivityId, 'BCF-Rueckmeldungen')

      for (const objectId of [reportObjectId, feedbackObjectId]) {
        const response = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/activities/${targetActivityId}/check-sources`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            canvas_object_id: objectId,
            notes: 'Dient als Pruefbasis.',
          },
        })
        expect(response.ok()).toBeTruthy()
      }

      await openActivityDetail(page, targetActivityId)
      const detail = page.getByTestId(`activity-detail-${targetActivityId}`)
      await expect(detail.getByText('Koordinationsbericht', { exact: true })).toBeVisible()
      await expect(detail.getByText('BCF-Rueckmeldungen', { exact: true })).toBeVisible()
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupOrganizationsByNames(createdOrganizationNames)
      if (scenarioUserEmail) {
        await deleteUserByEmail(scenarioUserEmail).catch(() => Promise.resolve())
      }
    }
  })
})


