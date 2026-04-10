import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  dragNodeBy,
  getAccessToken,
  getActivityNodeIds,
  login,
  requireCredentials,
  testSuffix,
} from './helpers'

async function getHandleOpacity(page: Parameters<typeof test>[0]['page'], nodeTestId: string, handleId: string) {
  const handle = page.locator(`[data-testid="${nodeTestId}"] .react-flow__handle[data-handleid="${handleId}"]`)
  return handle.evaluate((element) => window.getComputedStyle(element).opacity)
}

test.describe('connection target preview', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('shows only the nearest target node handles while dragging a connection nearby', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workspaceName = `Connector Preview ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      await page.getByTestId('toolbar-activity').click()
      await page.getByTestId('toolbar-activity').click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(3)

      const activityIds = await getActivityNodeIds(page)
      const [firstActivityId, secondActivityId, thirdActivityId] = activityIds
      expect(firstActivityId).toBeTruthy()
      expect(secondActivityId).toBeTruthy()
      expect(thirdActivityId).toBeTruthy()

      const firstNode = page.getByTestId(`activity-node-${firstActivityId}`)
      const secondNode = page.getByTestId(`activity-node-${secondActivityId}`)
      const thirdNode = page.getByTestId(`activity-node-${thirdActivityId}`)

      await dragNodeBy(page, `activity-node-${thirdActivityId}`, { x: 260, y: 180 })

      await firstNode.click()
      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${firstActivityId}`, 'source-right'), { timeout: 5_000 })
        .toBe('1')
      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${secondActivityId}`, 'target-left'), { timeout: 5_000 })
        .toBe('0')
      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${thirdActivityId}`, 'target-left'), { timeout: 5_000 })
        .toBe('0')

      const sourceHandle = page.locator(
        `[data-testid="activity-node-${firstActivityId}"] .react-flow__handle[data-handleid="source-right"]`,
      )
      const sourceBox = await sourceHandle.boundingBox()
      const secondBox = await secondNode.boundingBox()
      const thirdBox = await thirdNode.boundingBox()
      expect(sourceBox).toBeTruthy()
      expect(secondBox).toBeTruthy()
      expect(thirdBox).toBeTruthy()

      await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2)
      await page.mouse.down()
      await page.mouse.move(secondBox!.x - 24, secondBox!.y + secondBox!.height / 2, { steps: 18 })

      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${secondActivityId}`, 'target-left'), { timeout: 5_000 })
        .toBe('1')
      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${thirdActivityId}`, 'target-left'), { timeout: 5_000 })
        .toBe('0')

      await page.mouse.move(40, 40, { steps: 10 })

      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${secondActivityId}`, 'target-left'), { timeout: 5_000 })
        .toBe('0')

      await page.mouse.move(secondBox!.x + 8, secondBox!.y + secondBox!.height / 2, { steps: 12 })
      await page.mouse.up()

      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${secondActivityId}`, 'target-left'), { timeout: 5_000 })
        .toBe('0')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})

