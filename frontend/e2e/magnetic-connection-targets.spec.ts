import { expect, test, type Page } from '@playwright/test'
import { cleanupWorkspaces, createWorkflow, dragNodeBy, getAccessToken, getActivityNodeIds, login, reopenWorkflowAfterReload, requireCredentials, testSuffix } from './helpers'

async function getHandleOpacity(page: Page, nodeTestId: string, handleId: string) {
  const handle = page.locator(`[data-testid="${nodeTestId}"] .react-flow__handle[data-handleid="${handleId}"]`)
  return handle.evaluate((element) => window.getComputedStyle(element).opacity)
}

async function dragConnectionNearTarget(page: Page, sourceActivityId: string, targetActivityId: string) {
  const sourceHandle = page.locator(
    `[data-testid="activity-node-${sourceActivityId}"] .react-flow__handle[data-handleid="source-right"]`,
  )
  const sourceBox = await sourceHandle.boundingBox()
  const targetNode = page.getByTestId(`activity-node-${targetActivityId}`)
  const targetBox = await targetNode.boundingBox()
  expect(sourceBox).toBeTruthy()
  expect(targetBox).toBeTruthy()

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox!.x - 24, targetBox!.y + targetBox!.height / 2, { steps: 18 })
}

async function cancelConnectionDrag(page: Page) {
  await page.mouse.move(40, 40, { steps: 10 })
  await page.mouse.up()
}

async function setMagneticTargets(page: Page, enabled: boolean) {
  await page.getByTestId('toolbar-settings').click()
  await page.getByTestId('settings-nav-ui').click()
  await page.getByTestId(enabled ? 'settings-ui-magnetic-targets-on' : 'settings-ui-magnetic-targets-off').click()
  await page.getByTestId('settings-ui-save').click()
  await page.getByTestId('settings-dialog-close').click()
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

test.describe('magnetic connection targets', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('respects the UI preference for magnetic target previews', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workspaceName = `Magnetic Targets ${testSuffix()}`
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

      await dragNodeBy(page, `activity-node-${thirdActivityId}`, { x: 260, y: 180 })

      await setMagneticTargets(page, false)
      await reopenWorkflowByName(page, createdWorkflow.id, workspaceName)

      await page.getByTestId(`activity-node-${firstActivityId}`).click()
      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${secondActivityId}`, 'target-left'), { timeout: 5_000 })
        .toBe('0')

      await dragConnectionNearTarget(page, firstActivityId, secondActivityId)
      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${secondActivityId}`, 'target-left'), { timeout: 5_000 })
        .toBe('0')
      await cancelConnectionDrag(page)

      await setMagneticTargets(page, true)
      await reopenWorkflowByName(page, createdWorkflow.id, workspaceName)

      await page.getByTestId(`activity-node-${firstActivityId}`).click()
      await dragConnectionNearTarget(page, firstActivityId, secondActivityId)
      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${secondActivityId}`, 'target-left'), { timeout: 5_000 })
        .toBe('1')
      await expect
        .poll(() => getHandleOpacity(page, `activity-node-${thirdActivityId}`, 'target-left'), { timeout: 5_000 })
        .toBe('0')
      await cancelConnectionDrag(page)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
