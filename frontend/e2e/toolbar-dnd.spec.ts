import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getActivityCenter,
  getActivityNodeIds,
  login,
  requireCredentials,
  testSuffix,
} from './helpers'

test.describe('toolbar drag and drop', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('inserts an activity at the drop position when dragged from the toolbar', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Toolbar Drag ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const previousActivityIds = await getActivityNodeIds(page)
      const canvas = page.getByTestId('workflow-canvas')
      const canvasBox = await canvas.boundingBox()
      expect(canvasBox).toBeTruthy()

      const targetPosition = {
        x: Math.round(canvasBox!.width * 0.76),
        y: Math.round(canvasBox!.height * 0.34),
      }

      await page.getByTestId('toolbar-activity').dragTo(canvas, {
        targetPosition,
      })

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      await expect(page.locator('[data-testid^="activity-detail-"]')).toHaveCount(0)

      const activityIds = await getActivityNodeIds(page)
      const insertedActivityId = activityIds.find((id) => !previousActivityIds.includes(id))
      expect(insertedActivityId).toBeTruthy()

      const activityCenter = await getActivityCenter(page, insertedActivityId!)
      const expectedCenter = {
        x: canvasBox!.x + targetPosition.x,
        y: canvasBox!.y + targetPosition.y,
      }

      expect(Math.abs(activityCenter.x - expectedCenter.x)).toBeLessThan(70)
      expect(Math.abs(activityCenter.y - expectedCenter.y)).toBeLessThan(70)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})


