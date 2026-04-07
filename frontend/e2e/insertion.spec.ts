import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getActivityCenter,
  getActivityNodeIds,
  login,
  requireCredentials,
  dragNodeBy,
  testSuffix,
} from './helpers'

test.describe('canvas insertion', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('inserts toolbar activity into the current viewport center without opening a popup', async ({ page, request }) => {
    test.setTimeout(90_000)
    const workspaceName = `Zentrierter Insert ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 30_000 }).toBe(1)
      const previousActivityIds = await getActivityNodeIds(page)
      const canvasBox = await page.getByTestId('workflow-canvas').boundingBox()
      expect(canvasBox).toBeTruthy()

      await page.getByTestId('toolbar-activity').click()

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      const activityIds = await getActivityNodeIds(page)
      const insertedActivityId = activityIds.find((id) => !previousActivityIds.includes(id))
      expect(insertedActivityId).toBeTruthy()
      await expect(page.locator('[data-testid^="activity-detail-"]')).toHaveCount(0)

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

  test('keeps a freshly inserted activity stable when it is dragged immediately', async ({ page, request }) => {
    test.setTimeout(90_000)
    const workspaceName = `Drag Repro ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 30_000 }).toBe(1)
      const previousActivityIds = await getActivityNodeIds(page)
      await page.getByTestId('toolbar-activity').click()

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      const activityIds = await getActivityNodeIds(page)
      const insertedActivityId = activityIds.find((id) => !previousActivityIds.includes(id))
      expect(insertedActivityId).toBeTruthy()

      await dragNodeBy(page, `activity-node-${insertedActivityId!}`, { x: 180, y: 90 })

      const positionAfterDrop = await getActivityCenter(page, insertedActivityId!)
      await page.waitForTimeout(2000)
      const positionAfterSettling = await getActivityCenter(page, insertedActivityId!)

      expect(Math.abs(positionAfterSettling.x - positionAfterDrop.x)).toBeLessThan(20)
      expect(Math.abs(positionAfterSettling.y - positionAfterDrop.y)).toBeLessThan(20)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})


