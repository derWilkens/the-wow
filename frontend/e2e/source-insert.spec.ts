import { expect, test } from '@playwright/test'
import { cleanupWorkspaces, createWorkflow, getAccessToken, login, requireCredentials, testSuffix } from './helpers'

test.describe('source insert chooser', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('allows creating a new source and reusing an existing source name', async ({ page, request }) => {
    test.setTimeout(120_000)
    const workspaceName = `Datenspeicher ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workspaceName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await page.getByTestId('toolbar-source').click()
      await expect(page.getByTestId('source-insert-dialog')).toBeVisible()
      await page.getByTestId('source-insert-create-new').click()

      await expect(page.locator('[data-testid^="source-node-"]')).toHaveCount(1, { timeout: 15_000 })
      await expect(page.locator('[data-testid^="source-node-"]').first()).toContainText('Neuer Datenspeicher')

      await page.getByTestId('toolbar-source').click()
      await expect(page.getByTestId('source-insert-dialog')).toBeVisible()
      await page.getByTestId('source-insert-use-existing').click()

      await expect(page.locator('[data-testid^="source-node-"]')).toHaveCount(2, { timeout: 15_000 })
      await expect(page.locator('[data-testid^="source-node-"]')).toContainText(['Neuer Datenspeicher', 'Neuer Datenspeicher'])
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
