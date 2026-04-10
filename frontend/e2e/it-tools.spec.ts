import { expect, test } from '@playwright/test'
import {
  cleanupITToolsByNames,
  cleanupWorkspaces,
  countITToolsByName,
  createWorkflow,
  getAccessToken,
  getActivityNodeIds,
  login,
  openActivityDetail,
  closeActivityDetail,
  reopenWorkflowAfterReload,
  requireCredentials,
  workspacesButton,
  testSuffix,
} from './helpers'

async function createSecondActivityViaApi(
  request: Parameters<typeof test>[0]['request'],
  accessToken: string,
  workspaceId: string,
) {
  const response = await request.post(`http://127.0.0.1:3000/workspaces/${workspaceId}/activities/upsert`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      parent_id: null,
      node_type: 'activity',
      label: 'Zweite Aktivitaet',
      trigger_type: null,
      position_x: 520,
      position_y: 260,
      status: 'draft',
      status_icon: null,
      activity_type: 'erstellen',
      description: 'Automatisch fuer den E2E-Test angelegt.',
      notes: null,
      duration_minutes: null,
      linked_workflow_id: null,
      linked_workflow_mode: null,
      linked_workflow_purpose: null,
      linked_workflow_inputs: [],
      linked_workflow_outputs: [],
    },
  })

  expect(response.ok()).toBeTruthy()
}

test.describe('it tools', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('creates a new IT tool from activity details and links it immediately', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workflowName = `IT Tool Neu ${testSuffix()}`
    const toolName = `SAP ${testSuffix()}`
    const toolDescription = 'Rechnungen und Buchungsdaten'
    const createdWorkspaceIds: string[] = []
    const createdToolNames = [toolName]
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [activityId] = await getActivityNodeIds(page)

      await openActivityDetail(page, activityId)
      await page.getByTestId('activity-tool-select-trigger').click()
      await page.getByTestId('activity-tool-select-create-toggle').click()
      await page.getByTestId('activity-tool-select-create-name').fill(toolName)
      await page.getByTestId('activity-tool-select-create-description').fill(toolDescription)
      await page.getByTestId('activity-tool-select-create-submit').click()

      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toContainText(toolName)
      await expect(page.getByTestId('activity-tool-select-trigger')).not.toContainText(toolName)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupITToolsByNames(createdToolNames)
    }
  })

  test('links an existing IT tool from activity details and does not offer it again', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workflowName = `IT Tool Verlinken ${testSuffix()}`
    const toolName = `Outlook ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    const createdToolNames = [toolName]
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [activityId] = await getActivityNodeIds(page)

      await openActivityDetail(page, activityId)
      await page.getByTestId('activity-tool-select-trigger').click()
      await page.getByTestId('activity-tool-select-create-toggle').click()
      await page.getByTestId('activity-tool-select-create-name').fill(toolName)
      const createToolResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/workspaces/${workflow.id}/it-tools`) &&
          response.request().method() === 'POST' &&
          response.status() === 201,
      )
      await page.getByTestId('activity-tool-select-create-submit').click()
      await createToolResponse
      const chip = page.locator('[data-testid^="activity-tool-chip-"]')
      await expect(chip).toContainText(toolName)
      const toolChipTestId = await chip.first().getAttribute('data-testid')
      const toolId = toolChipTestId?.replace('activity-tool-chip-', '')
      expect(toolId).toBeTruthy()

      const unlinkToolResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/workspaces/${workflow.id}/activities/${activityId}/tools/`) &&
          response.request().method() === 'DELETE' &&
          response.status() === 200,
      )
      await chip.click()
      await unlinkToolResponse
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toHaveCount(0)

      const trigger = page.getByTestId('activity-tool-select-trigger')
      const panel = page.getByTestId('activity-tool-select-panel')
      const toolOption = page.getByTestId(`activity-tool-select-option-${toolId}`)

      await trigger.click({ force: true })
      await expect(panel).toBeVisible()
      await expect(toolOption).toBeVisible()
      await toolOption.dispatchEvent('click')
      await expect(trigger).toContainText(toolName)
      const relinkToolResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/workspaces/${workflow.id}/activities/${activityId}/tools`) &&
          response.request().method() === 'POST' &&
          response.status() === 201,
      )
      await page.getByTestId('activity-tool-link-submit').click()
      await relinkToolResponse

      await expect(page.getByTestId(/activity-tool-chip-.+/)).toContainText(toolName)
      await trigger.click({ force: true })
      await expect(panel).toBeVisible()
      await expect(page.getByTestId(`activity-tool-select-option-${toolId}`)).toHaveCount(0)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupITToolsByNames(createdToolNames)
    }
  })

  test('removes a linked IT tool from an activity', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workflowName = `IT Tool Entfernen ${testSuffix()}`
    const toolName = `Excel ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    const createdToolNames = [toolName]
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [activityId] = await getActivityNodeIds(page)

      await openActivityDetail(page, activityId)
      await page.getByTestId('activity-tool-select-trigger').click()
      await page.getByTestId('activity-tool-select-create-toggle').click()
      await page.getByTestId('activity-tool-select-create-name').fill(toolName)
      await page.getByTestId('activity-tool-select-create-submit').click()

      const chip = page.locator('[data-testid^="activity-tool-chip-"]')
      await expect(chip).toContainText(toolName)
      await chip.click()
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toHaveCount(0)
      await expect(page.getByText('Noch kein IT-Tool verlinkt')).toBeVisible()
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupITToolsByNames(createdToolNames)
    }
  })

  test('reuses the same IT tool across multiple activities without creating duplicates', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workflowName = `IT Tool Mehrfach ${testSuffix()}`
    const toolName = `Teams ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    const createdToolNames = [toolName]
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [firstActivityId] = await getActivityNodeIds(page)

      await openActivityDetail(page, firstActivityId)
      await page.getByTestId('activity-tool-select-trigger').click()
      await page.getByTestId('activity-tool-select-create-toggle').click()
      await page.getByTestId('activity-tool-select-create-name').fill(toolName)
      await page.getByTestId('activity-tool-select-create-submit').click()
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toContainText(toolName)
      await closeActivityDetail(page)

      await createSecondActivityViaApi(request, accessToken!, workflow.id)
      await reopenWorkflowAfterReload(page, workflow.id)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      const secondActivityId = (await getActivityNodeIds(page)).find((id) => id !== firstActivityId)
      expect(secondActivityId).toBeTruthy()

      await openActivityDetail(page, secondActivityId!)
      const trigger = page.getByTestId('activity-tool-select-trigger')
      const panel = page.getByTestId('activity-tool-select-panel')

      await trigger.click({ force: true })
      await expect(panel).toBeVisible()
      await expect(panel.getByText(toolName, { exact: true })).toBeVisible()
      await panel.getByText(toolName, { exact: true }).click()
      await expect(trigger).toContainText(toolName)
      await page.getByTestId('activity-tool-link-submit').click()
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toContainText(toolName)

      await expect.poll(() => countITToolsByName(toolName), { timeout: 15_000 }).toBe(1)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupITToolsByNames(createdToolNames)
    }
  })

  test('reuses the same IT tool across multiple workflows without creating duplicates', async ({ page, request }) => {
    test.setTimeout(60_000)
    const firstWorkflowName = `IT Tool Workflow A ${testSuffix()}`
    const secondWorkflowName = `IT Tool Workflow B ${testSuffix()}`
    const toolName = `DocuWare ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    const createdToolNames = [toolName]
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const firstWorkflow = await createWorkflow(page, firstWorkflowName)
      createdWorkspaceIds.push(firstWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [firstActivityId] = await getActivityNodeIds(page)

      await openActivityDetail(page, firstActivityId)
      await page.getByTestId('activity-tool-select-trigger').click()
      await page.getByTestId('activity-tool-select-create-toggle').click()
      await page.getByTestId('activity-tool-select-create-name').fill(toolName)
      await page.getByTestId('activity-tool-select-create-submit').click()
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toContainText(toolName)

      await page.getByRole('button', { name: workspacesButton }).click()
      const secondWorkflow = await createWorkflow(page, secondWorkflowName)
      createdWorkspaceIds.push(secondWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [secondActivityId] = await getActivityNodeIds(page)

      await openActivityDetail(page, secondActivityId)
      await page.getByTestId('activity-tool-select-trigger').click()
      await page.getByTestId('activity-tool-select-panel').getByRole('button', { name: new RegExp(toolName) }).click()
      await page.getByTestId('activity-tool-link-submit').click()
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toContainText(toolName)

      await expect.poll(() => countITToolsByName(toolName), { timeout: 15_000 }).toBe(1)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupITToolsByNames(createdToolNames)
    }
  })

  test('reopens activity details after reload and keeps linked IT tools visible', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workflowName = `IT Tool Reload ${testSuffix()}`
    const toolName = `Jira ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    const createdToolNames = [toolName]
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [activityId] = await getActivityNodeIds(page)

      await openActivityDetail(page, activityId)
      await page.getByTestId('activity-tool-select-trigger').click()
      await page.getByTestId('activity-tool-select-create-toggle').click()
      await page.getByTestId('activity-tool-select-create-name').fill(toolName)
      await page.getByTestId('activity-tool-select-create-submit').click()
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toContainText(toolName)

      await reopenWorkflowAfterReload(page, workflow.id)

      await openActivityDetail(page, activityId)
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toContainText(toolName)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupITToolsByNames(createdToolNames)
    }
  })
})




