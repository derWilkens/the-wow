import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  connectHandleToNodeSide,
  createWorkflow,
  getAccessToken,
  getActivityNodeIds,
  getEdgeTargetsFromSource,
  getGatewayNodeIds,
  login,
  requireCredentials,
  selectEdgeByConnection,
  testSuffix,
} from './helpers'

test.describe('gateway second path label', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  async function saveEdgeLabel(page: import('@playwright/test').Page, label: string) {
    await page.getByTestId('edge-path-label').fill(label)
    await expect(page.getByTestId('edge-save')).toBeEnabled()
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/canvas-edges/upsert') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    )
    await page.getByTestId('edge-save').click()
    await responsePromise
  }

  test('labels the second outgoing decision edge after the first one was already saved', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Gateway Seq ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [seededActivityId] = await getActivityNodeIds(page)

      await page.getByTestId(`activity-node-${seededActivityId}`).click()
      await page.getByTestId('toolbar-decision').click()
      await expect.poll(async () => (await getGatewayNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      const [decisionId] = await getGatewayNodeIds(page)
      await page.getByTestId('toolbar-activity').click()
      await page.getByTestId(`gateway-node-${decisionId}`).click()
      await page.getByTestId('toolbar-activity').click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(3)

      let targets = await getEdgeTargetsFromSource(page, decisionId)
      if (targets.length < 2) {
        const fallbackTarget = (await getActivityNodeIds(page)).find((id) => id !== seededActivityId && !targets.includes(id))
        expect(fallbackTarget).toBeTruthy()
        await connectHandleToNodeSide(page, `gateway-node-${decisionId}`, 'source-right', `activity-node-${fallbackTarget!}`, 'left')
        await expect.poll(async () => (await getEdgeTargetsFromSource(page, decisionId)).length, { timeout: 15_000 }).toBe(2)
        targets = await getEdgeTargetsFromSource(page, decisionId)
      }

      await selectEdgeByConnection(page, decisionId, targets[0])
      await saveEdgeLabel(page, 'Ja')

      await selectEdgeByConnection(page, decisionId, targets[1])
      await expect(page.getByTestId('edge-path-label')).toHaveValue(/^(|Nein|Ja)$/)
      await saveEdgeLabel(page, 'Nein')

      await expect(page.locator('[data-testid^="edge-label-"]')).toContainText(['Ja', 'Nein'])
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
