import { expect, test, type Locator, type Page } from '@playwright/test'
import { apiBaseUrl, cleanupWorkspaces, createWorkflow, getAccessToken, login, reopenWorkflowAfterReload, requireCredentials, testSuffix } from './helpers'

async function dragLassoAround(page: Page, firstNode: Locator, secondNode: Locator) {
  const pane = page.locator('.react-flow__pane')
  const paneBox = await pane.boundingBox()
  const firstBox = await firstNode.boundingBox()
  const secondBox = await secondNode.boundingBox()
  expect(paneBox).toBeTruthy()
  expect(firstBox).toBeTruthy()
  expect(secondBox).toBeTruthy()

  const left = Math.max(paneBox!.x + 8, Math.min(firstBox!.x, secondBox!.x) - 48)
  const top = Math.max(paneBox!.y + 8, Math.min(firstBox!.y, secondBox!.y) - 48)
  const right = Math.min(paneBox!.x + paneBox!.width - 8, Math.max(firstBox!.x + firstBox!.width, secondBox!.x + secondBox!.width) + 48)
  const bottom = Math.min(paneBox!.y + paneBox!.height - 8, Math.max(firstBox!.y + firstBox!.height, secondBox!.y + secondBox!.height) + 48)

  await pane.click({ position: { x: 12, y: 12 } })
  await page.mouse.move(left, top)
  await page.mouse.down()
  await page.mouse.move(right, bottom, { steps: 12 })
  await page.mouse.up()
}

async function clearCanvasSelection(page: Page) {
  const pane = page.locator('.react-flow__pane')
  await pane.click({ position: { x: 12, y: 12 } })
  await expect(page.locator('.react-flow__nodesselection-rect')).toHaveCount(0, { timeout: 15_000 })
}

async function selectGroupNode(page: Page, groupId: string) {
  await page.getByTestId(`rf__node-${groupId}`).click({ position: { x: 88, y: 16 } })
}

test.describe('group selection', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('creates a persistent group from a lasso selection', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workspaceName = `Group Selection ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(workflow.id)

      const activityNodes = page.locator('[data-testid^="activity-node-"]')
      await expect(activityNodes).toHaveCount(1, { timeout: 15_000 })

      const firstActivity = activityNodes.first()
      const firstActivityTestId = await firstActivity.getAttribute('data-testid')
      expect(firstActivityTestId).toBeTruthy()

      await firstActivity.click()
      await page.getByTestId('toolbar-activity').click()
      await expect(activityNodes).toHaveCount(2, { timeout: 15_000 })

      const secondActivity = activityNodes.nth(1)
      await dragLassoAround(page, firstActivity, secondActivity)

      await expect(page.getByTestId('canvas-selection-actions')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('canvas-selection-action-group')).toBeEnabled()

      const createGroupResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/canvas-groups/upsert') &&
          response.request().method() === 'POST',
        { timeout: 15_000 },
      )

      await page.getByTestId('canvas-selection-action-group').click()
      const response = await createGroupResponse
      expect(response.ok()).toBe(true)

      const groupNode = page.locator('[data-testid^="group-node-"]').first()
      await expect(groupNode).toBeVisible({ timeout: 15_000 })

      await reopenWorkflowAfterReload(page, workflow.id)
      await expect(page.locator('[data-testid^="group-node-"]').first()).toBeVisible({ timeout: 15_000 })
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('renames and collapses a persistent group across reload', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workspaceName = `Group Collapse ${testSuffix()}`
    const renamedGroupLabel = `Fokusgruppe ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(workflow.id)

      const activityNodes = page.locator('[data-testid^="activity-node-"]')
      await expect(activityNodes).toHaveCount(1, { timeout: 15_000 })

      const activitiesResponse = await request.get(`${apiBaseUrl}/workspaces/${workflow.id}/activities`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        failOnStatusCode: false,
      })
      expect(activitiesResponse.ok()).toBe(true)
      const activities = ((await activitiesResponse.json()) as Array<Record<string, unknown>>).filter(
        (activity) => activity.node_type === 'activity',
      )
      expect(activities).toHaveLength(1)

      const sourceActivity = activities[0]
      const secondActivityResponse = await request.post(`${apiBaseUrl}/workspaces/${workflow.id}/activities/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          parent_id: null,
          node_type: 'activity',
          label: 'Neue Aktivität 2',
          trigger_type: null,
          position_x: Number(sourceActivity.position_x) + 280,
          position_y: Number(sourceActivity.position_y),
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
      expect(secondActivityResponse.ok()).toBe(true)

      const updatedActivitiesResponse = await request.get(`${apiBaseUrl}/workspaces/${workflow.id}/activities`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        failOnStatusCode: false,
      })
      expect(updatedActivitiesResponse.ok()).toBe(true)
      const groupableActivities = ((await updatedActivitiesResponse.json()) as Array<Record<string, unknown>>).filter(
        (activity) => activity.node_type === 'activity',
      )
      expect(groupableActivities).toHaveLength(2)

      const groupBounds = groupableActivities.reduce(
        (accumulator, activity) => {
          const x = Number(activity.position_x)
          const y = Number(activity.position_y)
          return {
            left: Math.min(accumulator.left, x),
            top: Math.min(accumulator.top, y),
            right: Math.max(accumulator.right, x + 220),
            bottom: Math.max(accumulator.bottom, y + 140),
          }
        },
        { left: Number.POSITIVE_INFINITY, top: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY },
      )

      const createGroupResponse = await request.post(`${apiBaseUrl}/workspaces/${workflow.id}/canvas-groups/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          label: 'Gruppe 1',
          position_x: groupBounds.left - 28,
          position_y: groupBounds.top - 28,
          width: groupBounds.right - groupBounds.left + 56,
          height: groupBounds.bottom - groupBounds.top + 56,
          collapsed: false,
        },
        failOnStatusCode: false,
      })
      expect(createGroupResponse.ok()).toBe(true)
      const createdGroup = (await createGroupResponse.json()) as { id: string }
      const groupId = createdGroup.id

      for (const activity of groupableActivities) {
        const updateResponse = await request.post(`${apiBaseUrl}/workspaces/${workflow.id}/activities/upsert`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            ...activity,
            group_id: groupId,
          },
          failOnStatusCode: false,
        })
        expect(updateResponse.ok()).toBe(true)
      }

      await reopenWorkflowAfterReload(page, workflow.id)
      await expect(page.getByTestId(`group-node-${groupId}`)).toBeVisible({ timeout: 15_000 })

      const renameResponse = await request.post(`${apiBaseUrl}/workspaces/${workflow.id}/canvas-groups/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          id: groupId,
          parent_activity_id: null,
          label: renamedGroupLabel,
          position_x: groupBounds.left - 28,
          position_y: groupBounds.top - 28,
          width: groupBounds.right - groupBounds.left + 56,
          height: groupBounds.bottom - groupBounds.top + 56,
          locked: false,
          collapsed: false,
          z_index: 0,
        },
        failOnStatusCode: false,
      })
      expect(renameResponse.ok()).toBe(true)

      await reopenWorkflowAfterReload(page, workflow.id)
      await clearCanvasSelection(page)
      await selectGroupNode(page, groupId)

      await expect(page.getByTestId(`group-node-label-input-${groupId}`)).toHaveValue(renamedGroupLabel, { timeout: 15_000 })

      const collapseResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/canvas-groups/upsert') &&
          response.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page.getByTestId(`group-node-toggle-collapsed-${groupId}`).click()
      expect((await collapseResponse).ok()).toBe(true)

      await expect(activityNodes).toHaveCount(0, { timeout: 15_000 })
      await expect(page.getByTestId(`group-node-label-${groupId}`)).toHaveText(renamedGroupLabel)

      await reopenWorkflowAfterReload(page, workflow.id)

      const reloadedGroupNode = page.locator('[data-testid^="group-node-"]').first()
      await expect(reloadedGroupNode).toBeVisible({ timeout: 15_000 })
      const reloadedGroupId = (await reloadedGroupNode.getAttribute('data-testid'))!.replace('group-node-', '')
      await expect(page.getByTestId(`group-node-label-${reloadedGroupId}`)).toHaveText(renamedGroupLabel, { timeout: 15_000 })
      await expect(page.locator('[data-testid^="activity-node-"]')).toHaveCount(0, { timeout: 15_000 })

      await selectGroupNode(page, reloadedGroupId)
      const expandResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/canvas-groups/upsert') &&
          response.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page.getByTestId(`group-node-toggle-collapsed-${reloadedGroupId}`).click()
      expect((await expandResponse).ok()).toBe(true)
      await expect(page.locator('[data-testid^="activity-node-"]')).toHaveCount(2, { timeout: 15_000 })
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
