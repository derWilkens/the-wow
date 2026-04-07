import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getEdgeCount,
  login,
  requireCredentials,
  selectFirstEdge,
  testSuffix,
} from './helpers'

async function addNamedEdgeDataObject(page: import('@playwright/test').Page, objectName: string) {
  await page.getByTestId('edge-add-new-data-object').click()
  const inlineInput = page.locator('[data-testid^="edge-inline-name-"]').last()
  await expect(inlineInput).toBeVisible({ timeout: 15_000 })
  const inputTestId = await inlineInput.getAttribute('data-testid')
  expect(inputTestId).toBeTruthy()
  const createdObjectId = inputTestId!.replace('edge-inline-name-', '')
  await inlineInput.fill(objectName)
  await page.getByTestId(`edge-inline-save-${createdObjectId}`).click()
  return createdObjectId
}

test.describe('edge two named data objects', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('creates two named edge data objects sequentially in the edge dialog', async ({ page, request }) => {
    const workspaceName = `Edge Data Seq ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)
      await selectFirstEdge(page)

      const firstId = await addNamedEdgeDataObject(page, 'Koordinationsbericht')
      const secondId = await addNamedEdgeDataObject(page, 'BCF-Rueckmeldungen')

      await expect(page.getByTestId(`edge-data-object-row-${firstId}`)).toContainText('Koordinationsbericht')
      await expect(page.getByTestId(`edge-data-object-row-${secondId}`)).toContainText('BCF-Rueckmeldungen')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
