import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getActivityNodeIds,
  login,
  requireCredentials,
  workflowSelectionHeading,
  testSuffix,
} from './helpers'

test.describe('canvas view', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('keeps viewport controls usable after a full page reload', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workflowName = `Canvas View Reload ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [activityId] = await getActivityNodeIds(page)

      const activity = page.getByTestId(`activity-node-${activityId}`)
      await expect(activity).toBeVisible()
      const initialBox = await activity.boundingBox()
      expect(initialBox).toBeTruthy()

      await page.getByRole('button', { name: 'zoom in' }).click()
      await expect.poll(async () => {
        const box = await activity.boundingBox()
        return box?.width ?? 0
      }, { timeout: 10_000 }).toBeGreaterThan((initialBox?.width ?? 0) + 5)

      await page.reload()
      await expect(page.getByText(workflowSelectionHeading)).toBeVisible()
      await page.getByTestId(`workspace-open-${createdWorkflow.id}`).click()

      await expect(activity).toBeVisible({ timeout: 15_000 })
      const reloadedBox = await activity.boundingBox()
      expect(reloadedBox).toBeTruthy()

      await page.getByRole('button', { name: 'zoom out' }).click()
      await expect.poll(async () => {
        const box = await activity.boundingBox()
        return box?.width ?? 0
      }, { timeout: 10_000 }).toBeLessThan((reloadedBox?.width ?? 0) - 5)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})




