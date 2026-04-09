import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getActivityCenter,
  getActivityNodeIds,
  getEdgeCount,
  getStartNodeIds,
  login,
  requireCredentials,
  testSuffix,
} from './helpers'

test.describe('smart insert', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('builds a linear flow with smart insert from the current selection', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Smart Insert ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => (await getStartNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      const [startId] = await getStartNodeIds(page)
      const [seededActivityId] = await getActivityNodeIds(page)

      await page.getByTestId(`start-node-${startId}`).click()
      await page.getByTestId('toolbar-activity').click()

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(2)

      const activityIdsAfterFirstInsert = await getActivityNodeIds(page)
      const firstInsertedActivityId = activityIdsAfterFirstInsert.find((id) => id !== seededActivityId)
      expect(firstInsertedActivityId).toBeTruthy()

      await page.getByTestId('toolbar-activity').click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(3)
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(3)

      const activityIdsAfterSecondInsert = await getActivityNodeIds(page)
      const secondInsertedActivityId = activityIdsAfterSecondInsert.find((id) => id !== seededActivityId && id !== firstInsertedActivityId)
      expect(secondInsertedActivityId).toBeTruthy()

      await page.getByTestId('toolbar-end').click()
      await expect(page.locator('[data-testid^="end-node-"]')).toHaveCount(1, { timeout: 15_000 })
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(4)

      const firstInsertedCenter = await getActivityCenter(page, firstInsertedActivityId!)
      const secondInsertedCenter = await getActivityCenter(page, secondInsertedActivityId!)
      expect(secondInsertedCenter.x).toBeGreaterThan(firstInsertedCenter.x + 120)
      expect(Math.abs(secondInsertedCenter.y - firstInsertedCenter.y)).toBeLessThan(40)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('falls back to centered insertion when smart insert context is incompatible', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Smart Fallback ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const canvasBox = await page.getByTestId('workflow-canvas').boundingBox()
      expect(canvasBox).toBeTruthy()

      await page.getByTestId('toolbar-source').click()
      await expect(page.getByTestId('source-insert-dialog')).toBeVisible()
      await page.getByTestId('source-insert-create-new').click()
      await expect(page.locator('[data-testid^="source-node-"]')).toHaveCount(1, { timeout: 15_000 })
      const sourceNodeTestId = await page.locator('[data-testid^="source-node-"]').first().getAttribute('data-testid')
      expect(sourceNodeTestId).toBeTruthy()

      await page.getByTestId(sourceNodeTestId!).click()
      const previousActivityIds = await getActivityNodeIds(page)
      await page.getByTestId('toolbar-activity').click()

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)

      const activityIds = await getActivityNodeIds(page)
      const insertedActivityId = activityIds.find((id) => !previousActivityIds.includes(id))
      expect(insertedActivityId).toBeTruthy()

      const activityCenter = await getActivityCenter(page, insertedActivityId!)
      const canvasCenter = {
        x: canvasBox!.x + canvasBox!.width / 2,
        y: canvasBox!.y + canvasBox!.height / 2,
      }

      expect(Math.abs(activityCenter.x - canvasCenter.x)).toBeLessThan(150)
      expect(Math.abs(activityCenter.y - canvasCenter.y)).toBeLessThan(150)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})


