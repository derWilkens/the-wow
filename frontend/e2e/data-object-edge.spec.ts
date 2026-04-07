import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  connectHandleToNodeSide,
  createWorkflow,
  getAccessToken,
  getActivityNodeIds,
  getEdgeCount,
  login,
  requireCredentials,
  selectEdgeByIndex,
  selectFirstEdge,
  workflowSelectionHeading,
  testSuffix,
} from './helpers'

test.describe('edge-attached data objects', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('shows the correct toolbar hint for data object edge mode', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenobjekt Hinweis ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await expect(page.getByTestId('toolbar-data-object')).toHaveAttribute(
        'title',
        'Markiere zuerst die Verbindung, auf der das Objekt transportiert wird',
      )

      await selectFirstEdge(page)
      await expect(page.getByTestId('toolbar-data-object')).toHaveAttribute('title', /Datenobjekt auf markierter Verbindung/)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('does not create a data object when no edge is selected', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenobjekt Ohne Kante ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await page.getByTestId('toolbar-data-object').click()
      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(0)
      await expect(page.locator('[data-testid^="edge-data-object-aggregate-"]')).toHaveCount(0)
      await expect(page.locator('[data-testid^="data-object-detail-"]')).toHaveCount(0)
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('shows a named single data object directly on the edge and opens quick management on click', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenobjekt Kante ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)
      await page.getByTestId('toolbar-data-object').click()

      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(1, { timeout: 15_000 })
      const chip = page.locator('[data-testid^="edge-data-object-chip-"]').first()
      await expect(chip).toContainText('Datenobjekt 1')
      await chip.click()
      await expect(page.locator('[data-testid^="edge-data-object-popover-"]')).toHaveCount(1, { timeout: 15_000 })
      await expect(page.getByRole('button', { name: 'Details der Verbindung' })).toBeVisible()
      await chip.dblclick()
      await expect(page.locator('[data-testid^="data-object-detail-"]')).toHaveCount(1, { timeout: 15_000 })
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('collapses multiple data objects on one edge into icon plus count and shows names on hover', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Mehrere Datenobjekte ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)
      await page.getByTestId('toolbar-data-object').click()
      await page.getByTestId('toolbar-data-object').click()

      await expect(page.locator('[data-testid^="edge-data-object-aggregate-"]')).toHaveCount(1, { timeout: 15_000 })
      const aggregate = page.locator('[data-testid^="edge-data-object-aggregate-"]').first()
      await expect(aggregate).toContainText('2')
      await aggregate.hover()
      await expect(page.locator('.wow-edge-data-tooltip')).toContainText('Datenobjekt 1')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('creates and names a new data object directly in the edge dialog', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenobjekt Quick Create ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)
      await page.getByTestId('edge-add-new-data-object').click()
      const inlineInput = page.locator('[data-testid^="edge-inline-name-"]')
      await expect(inlineInput).toHaveCount(1, { timeout: 15_000 })
      const inlineInputTestId = await inlineInput.first().getAttribute('data-testid')
      expect(inlineInputTestId).toBeTruthy()
      const createdDataObjectId = inlineInputTestId!.replace('edge-inline-name-', '')

      await inlineInput.first().fill('Gepruefte Rechnung')
      await page.getByTestId(`edge-inline-save-${createdDataObjectId}`).click()

      await expect(page.locator('[data-testid^="edge-data-object-chip-"]').first()).toContainText('Gepruefte Rechnung')
      await expect(page.getByTestId(`edge-data-object-row-${createdDataObjectId}`)).toContainText('Noch keine Felder')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('adds an existing data object from the same workflow in the edge dialog', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenobjekt Wiederverwenden ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [seededActivityId] = await getActivityNodeIds(page)

      await page.getByTestId('toolbar-activity').click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(2)
      const secondActivityId = (await getActivityNodeIds(page)).find((id) => id !== seededActivityId)
      expect(secondActivityId).toBeTruthy()

      await connectHandleToNodeSide(page, `activity-node-${seededActivityId}`, 'source-bottom', `activity-node-${secondActivityId!}`, 'top')
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(2)

      await selectEdgeByIndex(page, 0)
      await page.getByTestId('toolbar-data-object').click()
      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(1, { timeout: 15_000 })

      await selectEdgeByIndex(page, 1)
      await page.getByTestId('edge-existing-data-object-search').fill('Datenobjekt')
      await expect(page.locator('[data-testid^="edge-existing-data-object-option-"]')).toHaveCount(1, { timeout: 15_000 })
      await page.locator('[data-testid^="edge-existing-data-object-option-"]').first().click()

      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(2, { timeout: 15_000 })
      await expect(page.locator('[data-testid^="edge-data-object-chip-"]').last()).toContainText('Datenobjekt 1')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('opens the full data object dialog from the edge detail panel and returns to the edge dialog on close', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenobjekt Detail Rueckweg ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)
      await page.getByTestId('edge-add-new-data-object').click()
      const inlineInput = page.locator('[data-testid^="edge-inline-name-"]')
      await expect(inlineInput).toHaveCount(1, { timeout: 15_000 })
      const inlineInputTestId = await inlineInput.first().getAttribute('data-testid')
      expect(inlineInputTestId).toBeTruthy()
      const createdDataObjectId = inlineInputTestId!.replace('edge-inline-name-', '')

      await inlineInput.first().fill('Lieferschein')
      await page.getByTestId(`edge-inline-save-${createdDataObjectId}`).click()
      await page.getByTestId(`edge-open-data-object-${createdDataObjectId}`).click()

      await expect(page.locator('[data-testid^="data-object-detail-"]')).toHaveCount(1, { timeout: 15_000 })
      await page.getByTestId('data-object-add-field').click()
      await page.getByTestId('data-object-save').click()

      await expect(page.locator('[data-testid^="data-object-detail-"]')).toHaveCount(0)
      await expect(page.getByTestId('edge-section-data-objects')).toBeVisible()
      await expect(page.getByTestId(`edge-data-object-row-${createdDataObjectId}`)).toContainText('1 Feld')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('closes the data object dialog immediately when deleting from the detail view', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenobjekt Dialog Delete ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)
      await page.getByTestId('toolbar-data-object').click()
      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(1, { timeout: 15_000 })

      await page.locator('[data-testid^="edge-data-object-chip-"]').first().dblclick()
      await expect(page.locator('[data-testid^="data-object-detail-"]')).toHaveCount(1, { timeout: 15_000 })
      await page.getByTestId('data-object-delete').click()

      await expect(page.locator('[data-testid^="data-object-detail-"]')).toHaveCount(0)
      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(0, { timeout: 15_000 })
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('deletes a selected edge-attached data object without deleting the edge', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenobjekt Delete ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)
      await page.getByTestId('toolbar-data-object').click()
      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(1, { timeout: 15_000 })

      await page.locator('[data-testid^="edge-data-object-chip-"]').first().click()
      await page.keyboard.press('Delete')

      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(0, { timeout: 15_000 })
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('deletes attached data objects when deleting the parent edge', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenobjekte Mit Kante ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)
      await page.getByTestId('toolbar-data-object').click()
      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(1, { timeout: 15_000 })

      await page.keyboard.press('Delete')

      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(0, { timeout: 15_000 })
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(0)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('persists edge-attached data objects across a full page reload', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenobjekt Reload ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)
      await page.getByTestId('toolbar-data-object').click()

      const chip = page.locator('[data-testid^="edge-data-object-chip-"]').first()
      await expect(chip).toHaveCount(1, { timeout: 15_000 })
      await chip.dblclick()
      await expect(page.locator('[data-testid^="data-object-detail-"]')).toHaveCount(1, { timeout: 15_000 })
      await page.getByTestId('data-object-name').fill('Gepruefte Rechnung')
      const saveResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/workspaces/${createdWorkflow.id}/canvas-objects/upsert`) &&
          response.request().method() === 'POST' &&
          response.status() === 201,
      )
      await page.getByTestId('data-object-save').click()
      await saveResponse
      await expect(page.locator('[data-testid^="data-object-detail-"]')).toHaveCount(0)
      await expect(page.locator('[data-testid^="edge-data-object-chip-"]').first()).toContainText('Gepruefte Rechnung')

      await page.reload()
      await expect(page.getByText(workflowSelectionHeading)).toBeVisible()
      await page.getByTestId(`workspace-open-${createdWorkflow.id}`).click()

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await expect(page.locator('[data-testid^="edge-data-object-chip-"]')).toHaveCount(1, { timeout: 15_000 })
      await expect(page.locator('[data-testid^="edge-data-object-chip-"]').first()).toContainText('Gepruefte Rechnung')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})




