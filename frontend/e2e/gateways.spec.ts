import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  connectHandleToNodeSide,
  createWorkflow,
  getAccessToken,
  getActivityNodeIds,
  getEdgeCount,
  getEdgeSourcesToTarget,
  getEdgeTargetsFromSource,
  getGatewayNodeIds,
  login,
  requireCredentials,
  selectEdgeByConnection,
  workflowSelectionHeading,
  testSuffix,
} from './helpers'

test.describe('gateways', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  async function saveEdgeLabel(page: import('@playwright/test').Page, label: string) {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/canvas-edges/upsert') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    )
    await page.getByTestId('edge-path-label').fill(label)
    await page.getByTestId('edge-save').click()
    await responsePromise
  }

  async function ensureDecisionHasTwoOutgoingPaths(page: import('@playwright/test').Page, decisionId: string, seededActivityId: string) {
    let decisionTargets = await getEdgeTargetsFromSource(page, decisionId)
    if (decisionTargets.length >= 2) {
      return decisionTargets
    }

    const candidateBranchIds = (await getActivityNodeIds(page)).filter(
      (id) => id !== seededActivityId && !decisionTargets.includes(id),
    )

    const missingBranchId = candidateBranchIds[0]
    expect(missingBranchId).toBeTruthy()

    await connectHandleToNodeSide(page, `gateway-node-${decisionId}`, 'source-right', `activity-node-${missingBranchId!}`, 'left')
    await expect.poll(async () => (await getEdgeTargetsFromSource(page, decisionId)).length, { timeout: 15_000 }).toBe(2)
    decisionTargets = await getEdgeTargetsFromSource(page, decisionId)
    return decisionTargets
  }

  test('builds a decision with labeled outgoing paths', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Gateway Entscheidung ${testSuffix()}`
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
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(2)

      const [decisionId] = await getGatewayNodeIds(page)
      await page.getByTestId('toolbar-activity').click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(3)

      await page.getByTestId(`gateway-node-${decisionId}`).click()
      await page.getByTestId('toolbar-activity').click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(3)
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(4)
      const resolvedBranchActivityIds = await ensureDecisionHasTwoOutgoingPaths(page, decisionId, seededActivityId)

      await selectEdgeByConnection(page, decisionId, resolvedBranchActivityIds[0])
      await saveEdgeLabel(page, 'Ja')
      await selectEdgeByConnection(page, decisionId, resolvedBranchActivityIds[1])
      await saveEdgeLabel(page, 'Nein')

      await expect(page.locator('[data-testid^="edge-label-"]')).toContainText(['Ja', 'Nein'])
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('supports merge gateways and preserves labels after reload', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Gateway Merge ${testSuffix()}`
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
      const resolvedBranchActivityIds = await ensureDecisionHasTwoOutgoingPaths(page, decisionId, seededActivityId)

      await page.getByTestId(`activity-node-${resolvedBranchActivityIds[0]}`).click()
      await page.getByTestId('toolbar-merge').click()
      await expect.poll(async () => (await getGatewayNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      const mergeId = (await getGatewayNodeIds(page)).find((id) => id !== decisionId)
      expect(mergeId).toBeTruthy()

      await expect.poll(async () => (await getEdgeSourcesToTarget(page, mergeId!)).length, { timeout: 15_000 }).toBe(1)
      const connectedBranchIds = await getEdgeSourcesToTarget(page, mergeId!)
      const otherBranchId = resolvedBranchActivityIds.find((id) => !connectedBranchIds.includes(id))
      expect(otherBranchId).toBeTruthy()

      await connectHandleToNodeSide(page, `activity-node-${otherBranchId!}`, 'source-right', `gateway-node-${mergeId!}`, 'left')
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(6)

      await selectEdgeByConnection(page, decisionId, resolvedBranchActivityIds[0])
      await saveEdgeLabel(page, 'Vollständig')
      await expect(page.locator('[data-testid^="edge-label-"]')).toContainText('Vollständig')

      await page.reload()
      await expect(page.getByText(workflowSelectionHeading)).toBeVisible()
      await page.getByTestId(`workspace-open-${createdWorkflow.id}`).click()

      await expect.poll(async () => (await getGatewayNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      await expect(page.locator('[data-testid^="edge-label-"]')).toContainText('Vollständig')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})




