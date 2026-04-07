import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getActivityNodeIds,
  login,
  openActivityDetail,
  requireCredentials,
  selectEdgeByConnection,
  testSuffix,
} from './helpers'

test.describe('activity detail from edge detail', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('opens the activity detail reliably even when an edge detail dialog is still open', async ({ page, request }) => {
    const workspaceName = `Edge To Activity ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [sourceActivityId] = await getActivityNodeIds(page)

      await page.getByTestId(`activity-node-${sourceActivityId}`).click()
      await page.getByTestId('toolbar-activity').click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      const targetActivityId = (await getActivityNodeIds(page)).find((id) => id !== sourceActivityId)
      expect(targetActivityId).toBeTruthy()

      await selectEdgeByConnection(page, sourceActivityId, targetActivityId!)
      await expect(page.getByTestId(`edge-detail-${sourceActivityId}-${targetActivityId}`)).toBeVisible()

      await openActivityDetail(page, targetActivityId!)
      await expect(page.getByTestId(`activity-detail-${targetActivityId}`)).toBeVisible()
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
