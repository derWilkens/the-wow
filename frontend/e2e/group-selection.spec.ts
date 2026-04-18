import { expect, test, type Locator, type Page } from '@playwright/test'
import { cleanupWorkspaces, createWorkflow, getAccessToken, login, reopenWorkflowAfterReload, requireCredentials, testSuffix } from './helpers'

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

      const firstActivity = activityNodes.first()
      await firstActivity.click()
      await page.getByTestId('toolbar-activity').click()
      await expect(activityNodes).toHaveCount(2, { timeout: 15_000 })

      const secondActivity = activityNodes.nth(1)
      await dragLassoAround(page, firstActivity, secondActivity)
      await expect(page.getByTestId('canvas-selection-actions')).toBeVisible({ timeout: 15_000 })

      const createGroupResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/canvas-groups/upsert') &&
          response.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page.getByTestId('canvas-selection-action-group').click()
      const createResponse = await createGroupResponse
      expect(createResponse.ok()).toBe(true)

      const groupNode = page.locator('[data-testid^="group-node-"]').first()
      await expect(groupNode).toBeVisible({ timeout: 15_000 })
      const groupNodeTestId = await groupNode.getAttribute('data-testid')
      expect(groupNodeTestId).toBeTruthy()
      const groupId = groupNodeTestId!.replace('group-node-', '')

      await clearCanvasSelection(page)
      await selectGroupNode(page, groupId)
      const labelInput = page.getByTestId(`group-node-label-input-${groupId}`)
      await expect(labelInput).toBeVisible({ timeout: 15_000 })

      const renameResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/canvas-groups/upsert') &&
          response.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await labelInput.fill(renamedGroupLabel)
      await labelInput.press('Tab')
      expect((await renameResponse).ok()).toBe(true)

      await expect(page.getByTestId(`group-node-label-${groupId}`)).toHaveText(renamedGroupLabel, { timeout: 15_000 })

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
