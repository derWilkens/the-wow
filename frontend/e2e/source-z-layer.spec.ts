import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { apiBaseUrl, cleanupWorkspaces, createWorkflow, getAccessToken, login, reopenWorkflowAfterReload, requireCredentials, testSuffix } from './helpers'

async function seedOverlappingSources(request: APIRequestContext, accessToken: string, workspaceId: string) {
  const lowerSourceResponse = await request.post(`${apiBaseUrl}/workspaces/${workspaceId}/canvas-objects/upsert`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      parent_activity_id: null,
      object_type: 'quelle',
      name: `Quelle A ${testSuffix()}`,
      position_x: 420,
      position_y: 240,
      z_index: 0,
    },
    failOnStatusCode: false,
  })
  expect(lowerSourceResponse.ok()).toBe(true)
  const lowerSource = (await lowerSourceResponse.json()) as { id: string }

  const higherSourceResponse = await request.post(`${apiBaseUrl}/workspaces/${workspaceId}/canvas-objects/upsert`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      parent_activity_id: null,
      object_type: 'quelle',
      name: `Quelle B ${testSuffix()}`,
      position_x: 446,
      position_y: 256,
      z_index: 1,
    },
    failOnStatusCode: false,
  })
  expect(higherSourceResponse.ok()).toBe(true)
  const higherSource = (await higherSourceResponse.json()) as { id: string }

  return { lowerSource, higherSource }
}

async function getNodeZIndex(page: Page, nodeId: string) {
  const value = await page.getByTestId(`source-node-${nodeId}`).evaluate((element) => {
    const wrapper = element.closest('.react-flow__node') as HTMLElement | null
    return wrapper ? window.getComputedStyle(wrapper).zIndex : null
  })

  return Number(value)
}

async function fetchSourceZIndices(request: APIRequestContext, accessToken: string, workspaceId: string, sourceIds: string[]) {
  const objectsResponse = await request.get(`${apiBaseUrl}/workspaces/${workspaceId}/canvas-objects`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    failOnStatusCode: false,
  })
  expect(objectsResponse.ok()).toBe(true)
  const objects = (await objectsResponse.json()) as Array<{ id: string; z_index?: number | null; object_type: string }>

  return sourceIds.map((sourceId) => {
    const entry = objects.find((candidate) => candidate.id === sourceId)
    expect(entry?.object_type).toBe('quelle')
    return {
      id: sourceId,
      zIndex: entry?.z_index ?? 0,
    }
  })
}

async function reopenSourceWorkflow(page: Page, workflowId: string, workflowName: string) {
  await page.reload()

  const toolbarActivity = page.getByTestId('toolbar-activity')
  if (await toolbarActivity.isVisible({ timeout: 10_000 }).catch(() => false)) {
    return
  }

  await reopenWorkflowAfterReload(page, workflowId).catch(async () => {
    const namedWorkflowButton = page.getByRole('button', { name: new RegExp(workflowName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
    await expect(namedWorkflowButton).toBeVisible({ timeout: 20_000 })
    await namedWorkflowButton.click()
    await expect(toolbarActivity).toBeVisible({ timeout: 15_000 })
  })
}

test.describe('source z-layer', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('brings an overlapping source to the front and keeps the layer after reload', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workspaceName = `Source Layer Front ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(workflow.id)
      const { lowerSource, higherSource } = await seedOverlappingSources(request, accessToken, workflow.id)

      await reopenSourceWorkflow(page, workflow.id, workspaceName)

      await expect(page.getByTestId(`source-node-${lowerSource.id}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`source-node-${higherSource.id}`)).toBeVisible({ timeout: 15_000 })

      const lowerBefore = await getNodeZIndex(page, lowerSource.id)
      const higherBefore = await getNodeZIndex(page, higherSource.id)
      expect(lowerBefore).toBeLessThan(higherBefore)

      await page.getByTestId(`source-node-${lowerSource.id}`).click({
        position: { x: 12, y: 12 },
      })
      await expect(page.getByTestId(`source-node-bring-front-${lowerSource.id}`)).toBeVisible({ timeout: 15_000 })

      const bringFrontResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/canvas-objects/upsert') &&
          response.request().method() === 'POST',
        { timeout: 15_000 },
      )

      await page.getByTestId(`source-node-bring-front-${lowerSource.id}`).click()
      expect((await bringFrontResponse).ok()).toBe(true)

      const [updatedLowerSource, unchangedHigherSource] = await fetchSourceZIndices(request, accessToken, workflow.id, [
        lowerSource.id,
        higherSource.id,
      ])
      expect(updatedLowerSource.zIndex).toBeGreaterThan(unchangedHigherSource.zIndex)

      await reopenSourceWorkflow(page, workflow.id, workspaceName)

      const lowerAfter = await getNodeZIndex(page, lowerSource.id)
      const higherAfter = await getNodeZIndex(page, higherSource.id)
      expect(lowerAfter).toBeGreaterThan(higherAfter)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('sends an overlapping source to the back and keeps the layer after reload', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workspaceName = `Source Layer Back ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(workflow.id)
      const { lowerSource, higherSource } = await seedOverlappingSources(request, accessToken, workflow.id)

      await reopenSourceWorkflow(page, workflow.id, workspaceName)

      await expect(page.getByTestId(`source-node-${lowerSource.id}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`source-node-${higherSource.id}`)).toBeVisible({ timeout: 15_000 })

      const lowerBefore = await getNodeZIndex(page, lowerSource.id)
      const higherBefore = await getNodeZIndex(page, higherSource.id)
      expect(lowerBefore).toBeLessThan(higherBefore)

      await page.getByTestId(`source-node-${higherSource.id}`).click({
        position: { x: 52, y: 20 },
      })
      await expect(page.getByTestId(`source-node-send-back-${higherSource.id}`)).toBeVisible({ timeout: 15_000 })

      const sendBackResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/canvas-objects/upsert') &&
          response.request().method() === 'POST',
        { timeout: 15_000 },
      )

      await page.getByTestId(`source-node-send-back-${higherSource.id}`).click()
      expect((await sendBackResponse).ok()).toBe(true)

      const [unchangedLowerSource, updatedHigherSource] = await fetchSourceZIndices(request, accessToken, workflow.id, [
        lowerSource.id,
        higherSource.id,
      ])
      expect(updatedHigherSource.zIndex).toBeLessThan(unchangedLowerSource.zIndex)

      await reopenSourceWorkflow(page, workflow.id, workspaceName)

      const lowerAfter = await getNodeZIndex(page, lowerSource.id)
      const higherAfter = await getNodeZIndex(page, higherSource.id)
      expect(higherAfter).toBeLessThan(lowerAfter)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
