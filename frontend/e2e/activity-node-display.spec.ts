import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  closeActivityDetail,
  createWorkflow,
  getAccessToken,
  getActivityNodeIds,
  login,
  openActivityDetail,
  requireCredentials,
  testSuffix,
} from './helpers'

test.describe('activity node display', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('shows the description only in a hover tooltip and toggles the subprocess marker state', async ({ page, request }) => {
    test.setTimeout(180_000)
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null
    const workflowName = `Node Display ${testSuffix()}`
    const subprocessName = `Node Detail ${testSuffix()}`
    const subprocessStep = `Node Step ${testSuffix()}`
    const activityDescription = 'Diese Beschreibung soll nur im Tooltip der Aktivitaet erscheinen.'
    const longActivityName = 'Sehr langer Aktivitaetsname fuer einen stabilen Umbruch auf zwei Zeilen im festen Knoten'

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [activityId] = await getActivityNodeIds(page)
      const node = page.getByTestId(`activity-node-${activityId}`)
      const title = page.getByTestId(`activity-inline-label-${activityId}`)
      const subprocessTrigger = page.getByTestId(`subprocess-trigger-${activityId}`)

      await expect(node).toHaveCSS('width', '220px')
      await expect(node).toHaveCSS('height', '140px')
      const nodeBoxBefore = await node.boundingBox()
      await expect(subprocessTrigger).toHaveAttribute('data-subprocess-state', 'empty')

      await openActivityDetail(page, activityId)
      const detail = page.getByTestId(`activity-detail-${activityId}`)
      await page.getByTestId('activity-detail-label').fill(longActivityName)
      await detail.locator('textarea').first().fill(activityDescription)
      await page.getByTestId('activity-detail-save').click()
      await expect(detail).toHaveCount(0, { timeout: 15_000 })

      await expect(node).not.toContainText(activityDescription)
      await expect(title).toContainText('Sehr langer Aktivitaetsname')
      await expect(title).toHaveAttribute('data-title-density', 'compact-strong')
      await expect(title).toHaveCSS('text-align', 'center')
      await expect(node).toHaveCSS('width', '220px')
      await expect(node).toHaveCSS('height', '140px')
      const nodeBoxAfter = await node.boundingBox()
      expect(nodeBoxAfter?.width).toBeCloseTo(nodeBoxBefore!.width, 0)
      expect(nodeBoxAfter?.height).toBeCloseTo(nodeBoxBefore!.height, 0)
      await title.hover()
      await expect(page.getByTestId(`activity-description-tooltip-${activityId}`)).toHaveText(activityDescription)
      await page.mouse.move(20, 20)
      await expect(page.getByTestId(`activity-description-tooltip-${activityId}`)).toHaveCount(0)

      await subprocessTrigger.click()
      await expect(page.getByTestId('subprocess-menu')).toBeVisible()
      await page.getByTestId('subprocess-menu-create').click()

      await expect(page.getByTestId('subprocess-wizard')).toBeVisible()
      await page.getByTestId('subprocess-name').fill(subprocessName)
      await page.getByTestId('subprocess-goal').fill('Der Detailablauf dient nur der Darstellung des Subprozessmarkers.')
      await page.getByTestId('subprocess-next').click()
      await page.getByTestId('subprocess-inputs').fill('Input')
      await page.getByTestId('subprocess-outputs').fill('Output')
      await page.getByTestId('subprocess-next').click()
      await page.getByTestId('subprocess-steps').fill(subprocessStep)

      const createSubprocessResponse = page.waitForResponse(
        (response) => response.url().includes(`/activities/${activityId}/subprocess`) && response.request().method() === 'POST',
      )
      await page.getByTestId('subprocess-submit').click()
      const createSubprocessPayload = (await (await createSubprocessResponse).json()) as { workspace: { id: string } }
      createdWorkspaceIds.push(createSubprocessPayload.workspace.id)

      await expect(page.getByText(subprocessStep)).toBeVisible({ timeout: 15_000 })
      await page.getByTestId(`workspace-trail-${workflow.id}`).click({ force: true })
      await expect(subprocessTrigger).toHaveAttribute('data-subprocess-state', 'linked')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
