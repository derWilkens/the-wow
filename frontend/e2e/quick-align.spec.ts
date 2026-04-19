import { expect, test, type Locator, type Page } from '@playwright/test'
import { apiBaseUrl, cleanupWorkspaces, createWorkflow, getAccessToken, login, reopenWorkflowAfterReload, requireCredentials, testSuffix } from './helpers'

async function createActivity(
  request: Parameters<typeof cleanupWorkspaces>[0],
  accessToken: string,
  workspaceId: string,
  input: { label: string; x: number; y: number },
) {
  const response = await request.post(`${apiBaseUrl}/workspaces/${workspaceId}/activities/upsert`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      parent_id: null,
      node_type: 'activity',
      label: input.label,
      trigger_type: null,
      position_x: input.x,
      position_y: input.y,
      status: 'draft',
      status_icon: null,
      activity_type: 'unbestimmt',
      description: '',
      notes: null,
      assignee_label: null,
      role_id: null,
      duration_minutes: null,
      linked_workflow_id: null,
      linked_workflow_mode: null,
      linked_workflow_purpose: null,
      linked_workflow_inputs: [],
      linked_workflow_outputs: [],
      is_locked: false,
    },
    failOnStatusCode: false,
  })
  expect(response.ok()).toBe(true)
  return (await response.json()) as { id: string; position_x: number; position_y: number }
}

async function reopenWorkflowByName(page: Page, workflowId: string, workflowName: string) {
  await page.reload()

  const toolbarActivity = page.getByTestId('toolbar-activity')
  if (await toolbarActivity.isVisible({ timeout: 10_000 }).catch(() => false)) {
    return
  }

  await reopenWorkflowAfterReload(page, workflowId).catch(async () => {
    const workflowButton = page.getByRole('button', {
      name: new RegExp(workflowName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    })
    await expect(workflowButton).toBeVisible({ timeout: 20_000 })
    await workflowButton.click()
    await expect(toolbarActivity).toBeVisible({ timeout: 15_000 })
  })
}

async function getNodeBoundingBox(page: Page, activityId: string) {
  const box = await page.getByTestId(`activity-node-${activityId}`).boundingBox()
  expect(box).toBeTruthy()
  return box!
}

async function fetchActivityPositions(request: Parameters<typeof cleanupWorkspaces>[0], accessToken: string, workspaceId: string, activityIds: string[]) {
  const response = await request.get(`${apiBaseUrl}/workspaces/${workspaceId}/activities`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    failOnStatusCode: false,
  })
  expect(response.ok()).toBe(true)
  const activities = (await response.json()) as Array<{ id: string; position_x: number; position_y: number }>
  return activityIds.map((activityId) => {
    const activity = activities.find((entry) => entry.id === activityId)
    expect(activity).toBeTruthy()
    return activity!
  })
}

async function lassoSelectActivities(page: Page, activityIds: string[]) {
  const pane = page.locator('.react-flow__pane')
  const paneBox = await pane.boundingBox()
  const boxes = await Promise.all(activityIds.map((activityId) => page.getByTestId(`rf__node-${activityId}`).boundingBox()))
  expect(paneBox).toBeTruthy()
  expect(boxes.every(Boolean)).toBe(true)

  const left = Math.min(...boxes.map((box) => box!.x))
  const top = Math.min(...boxes.map((box) => box!.y))
  const right = Math.max(...boxes.map((box) => box!.x + box!.width))
  const bottom = Math.max(...boxes.map((box) => box!.y + box!.height))

  const startX = Math.max(paneBox!.x + 16, left - 80)
  const startY = Math.max(paneBox!.y + 16, top - 80)
  const endX = Math.min(paneBox!.x + paneBox!.width - 16, right + 80)
  const endY = Math.min(paneBox!.y + paneBox!.height - 16, bottom + 80)

  await pane.click({ position: { x: 12, y: 12 } })
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, endY, { steps: 20 })
  await page.mouse.up()
}

test.describe('quick align', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('aligns three selected activities to the same left edge and keeps it after reload', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workspaceName = `Quick Align ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(workflow.id)

      const firstActivity = await createActivity(request, accessToken, workflow.id, {
        label: `Start Align ${testSuffix()}`,
        x: 320,
        y: 220,
      })
      const firstActivityId = firstActivity.id

      const secondActivity = await createActivity(request, accessToken, workflow.id, {
        label: `Ausrichten ${testSuffix()}`,
        x: Number(firstActivity.position_x) + 220,
        y: 400,
      })
      const thirdActivity = await createActivity(request, accessToken, workflow.id, {
        label: `Ausrichten Extra ${testSuffix()}`,
        x: Number(firstActivity.position_x) + 420,
        y: 300,
      })

      await reopenWorkflowByName(page, workflow.id, workspaceName)

      const firstNode = page.getByTestId(`activity-node-${firstActivityId}`)
      const secondNode = page.getByTestId(`activity-node-${secondActivity.id}`)
      const thirdNode = page.getByTestId(`activity-node-${thirdActivity.id}`)
      await expect(firstNode).toBeVisible({ timeout: 15_000 })
      await expect(secondNode).toBeVisible({ timeout: 15_000 })
      await expect(thirdNode).toBeVisible({ timeout: 15_000 })

      const firstBefore = await getNodeBoundingBox(page, firstActivityId)
      const secondBefore = await getNodeBoundingBox(page, secondActivity.id)
      const thirdBefore = await getNodeBoundingBox(page, thirdActivity.id)
      expect(Math.abs(firstBefore.x - secondBefore.x)).toBeGreaterThan(20)
      expect(Math.abs(firstBefore.x - thirdBefore.x)).toBeGreaterThan(20)

      await lassoSelectActivities(page, [firstActivityId, secondActivity.id, thirdActivity.id])
      await expect(page.getByTestId('canvas-selection-bounds')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('canvas-selection-actions')).toBeVisible({ timeout: 15_000 })

      const alignRequests: Promise<unknown>[] = []
      for (let index = 0; index < 3; index += 1) {
        alignRequests.push(
          page.waitForResponse(
            (response) =>
              response.url().includes('/activities/upsert') &&
              response.request().method() === 'POST',
            { timeout: 15_000 },
          ),
        )
      }

      await page.getByTestId('canvas-selection-action-align-left').dispatchEvent('click')
      await Promise.all(alignRequests)

      await expect.poll(async () => {
        const [updatedFirst, updatedSecond, updatedThird] = await fetchActivityPositions(request, accessToken, workflow.id, [
          firstActivityId,
          secondActivity.id,
          thirdActivity.id,
        ])
        return [updatedFirst.position_x, updatedSecond.position_x, updatedThird.position_x]
      }).toEqual([Number(firstActivity.position_x), Number(firstActivity.position_x), Number(firstActivity.position_x)])

      await reopenWorkflowByName(page, workflow.id, workspaceName)

      const firstAfter = await getNodeBoundingBox(page, firstActivityId)
      const secondAfter = await getNodeBoundingBox(page, secondActivity.id)
      const thirdAfter = await getNodeBoundingBox(page, thirdActivity.id)
      expect(Math.abs(firstAfter.x - secondAfter.x)).toBeLessThan(2)
      expect(Math.abs(firstAfter.x - thirdAfter.x)).toBeLessThan(2)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('distributes three selected activities horizontally and keeps the spacing after reload', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workspaceName = `Quick Distribute ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(workflow.id)

      const firstActivity = await createActivity(request, accessToken, workflow.id, {
        label: `Verteilen A ${testSuffix()}`,
        x: 240,
        y: 240,
      })
      const secondActivity = await createActivity(request, accessToken, workflow.id, {
        label: `Verteilen B ${testSuffix()}`,
        x: 470,
        y: 360,
      })
      const thirdActivity = await createActivity(request, accessToken, workflow.id, {
        label: `Verteilen C ${testSuffix()}`,
        x: 820,
        y: 260,
      })

      await reopenWorkflowByName(page, workflow.id, workspaceName)

      await expect(page.getByTestId(`activity-node-${firstActivity.id}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`activity-node-${secondActivity.id}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`activity-node-${thirdActivity.id}`)).toBeVisible({ timeout: 15_000 })

      await lassoSelectActivities(page, [firstActivity.id, secondActivity.id, thirdActivity.id])
      await expect(page.getByTestId('canvas-selection-bounds')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('canvas-selection-actions')).toBeVisible({ timeout: 15_000 })

      const distributeRequests: Promise<unknown>[] = []
      for (let index = 0; index < 3; index += 1) {
        distributeRequests.push(
          page.waitForResponse(
            (response) =>
              response.url().includes('/activities/upsert') &&
              response.request().method() === 'POST',
            { timeout: 15_000 },
          ),
        )
      }

      await page.getByTestId('canvas-selection-action-distribute-horizontal').dispatchEvent('click')
      await Promise.all(distributeRequests)

      await expect.poll(async () => {
        const [updatedFirst, updatedSecond, updatedThird] = await fetchActivityPositions(request, accessToken, workflow.id, [
          firstActivity.id,
          secondActivity.id,
          thirdActivity.id,
        ])
        return [updatedFirst.position_x, updatedSecond.position_x, updatedThird.position_x]
      }).toEqual([240, 530, 820])

      await reopenWorkflowByName(page, workflow.id, workspaceName)

      const firstAfter = await getNodeBoundingBox(page, firstActivity.id)
      const secondAfter = await getNodeBoundingBox(page, secondActivity.id)
      const thirdAfter = await getNodeBoundingBox(page, thirdActivity.id)
      const leftGap = Math.round(secondAfter.x - firstAfter.x)
      const rightGap = Math.round(thirdAfter.x - secondAfter.x)
      expect(Math.abs(leftGap - rightGap)).toBeLessThan(2)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
