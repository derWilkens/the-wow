import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  connectHandleToNodeSide,
  createWorkflow,
  dragNodeBy,
  getAccessToken,
  getActivityNodeIds,
  getEdgeCount,
  getStartNodeIds,
  login,
  requireCredentials,
  testSuffix,
} from './helpers'

test.describe('connections', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('creates connections across activities and datenspeicher nodes', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Verbindungen ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => (await getStartNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      const [seededActivityId] = await getActivityNodeIds(page)

      await page.getByTestId('toolbar-activity').click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      const activityIds = await getActivityNodeIds(page)
      const secondActivityId = activityIds.find((id) => id !== seededActivityId)
      expect(secondActivityId).toBeTruthy()

      await page.getByTestId('toolbar-end').click()
      await expect(page.locator('[data-testid^="end-node-"]')).toHaveCount(1, { timeout: 15_000 })
      const endNodeTestId = await page.locator('[data-testid^="end-node-"]').first().getAttribute('data-testid')
      expect(endNodeTestId).toBeTruthy()

      await page.getByTestId('workflow-canvas').click({ position: { x: 40, y: 40 } })
      await page.getByTestId('toolbar-source').click()
      await expect(page.getByTestId('source-insert-dialog')).toBeVisible()
      await page.getByTestId('source-insert-create-new').click()
      await expect(page.locator('[data-testid^="source-node-"]')).toHaveCount(1, { timeout: 15_000 })
      const sourceNodeTestId = await page.locator('[data-testid^="source-node-"]').first().getAttribute('data-testid')
      expect(sourceNodeTestId).toBeTruthy()
      await dragNodeBy(page, sourceNodeTestId!, { x: 220, y: -160 })

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(2)

      await connectHandleToNodeSide(page, sourceNodeTestId!, 'source-right', `activity-node-${seededActivityId}`, 'left')
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(3)

      await connectHandleToNodeSide(page, `activity-node-${seededActivityId}`, 'source-right', `activity-node-${secondActivityId}`, 'left')
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(4)

    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})


