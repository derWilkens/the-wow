import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getEdgeCount,
  login,
  requireCredentials,
  selectFirstEdge,
  workflowSelectionHeading,
  testSuffix,
} from './helpers'

test.describe('edge attributes', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('creates connections without forcing edge attributes and edits them afterwards', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Kantenattribute ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)

      await expect(page.getByTestId('edge-transport-mode-trigger')).toBeVisible()
      await expect(page.getByTestId('edge-transport-description')).toContainText('Waehle bei Bedarf')

      await page.getByTestId('edge-transport-mode-trigger').click()
      await page
        .getByTestId('edge-transport-mode-panel')
        .getByRole('button', { name: /Mail/i })
        .click()
      await expect(page.getByTestId('edge-transport-description')).toContainText(/Mail|E-Mail/i)
      await page.getByTestId('edge-notes').fill('Uebergabe per Mail an den naechsten Bearbeiter.')
      await page.getByTestId('edge-save').click()

      await page.getByTestId('workflow-canvas').click({ position: { x: 20, y: 20 } })
      await selectFirstEdge(page)

      await expect(page.getByTestId('edge-transport-mode-trigger')).toContainText('Mail')
      await expect(page.getByTestId('edge-transport-description')).toContainText(/Mail|E-Mail/i)
      await expect(page.getByTestId('edge-notes')).toHaveValue('Uebergabe per Mail an den naechsten Bearbeiter.')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('persists edge attributes across a full page reload', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Kantenattribute Reload ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)

      await page.getByTestId('edge-transport-mode-trigger').click()
      await page
        .getByTestId('edge-transport-mode-panel')
        .getByRole('button', { name: /Mail/i })
        .click()
      await page.getByTestId('edge-notes').fill('Zwischenspeicherung bis zur naechsten Bearbeitung.')
      await page.getByTestId('edge-save').click()

      await page.getByTestId('workflow-canvas').click({ position: { x: 20, y: 20 } })
      await selectFirstEdge(page)
      await expect(page.getByTestId('edge-notes')).toHaveValue('Zwischenspeicherung bis zur naechsten Bearbeitung.')

      await page.reload()
      await expect(page.getByText(workflowSelectionHeading)).toBeVisible()
      await page.getByTestId(`workspace-open-${createdWorkflow.id}`).click()

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)

      await expect(page.getByTestId('edge-notes')).toHaveValue('Zwischenspeicherung bis zur naechsten Bearbeitung.')
      await expect(page.getByTestId('edge-transport-status-chip')).not.toHaveText('Kein Transportmodus gesetzt')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})




