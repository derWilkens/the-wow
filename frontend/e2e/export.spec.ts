import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  login,
  requireCredentials,
  workflowSelectionHeading,
  testSuffix,
} from './helpers'

test.describe('export', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('keeps export actions available after a full page reload', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workflowName = `Export Reload ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdWorkflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await expect(page.getByTestId('toolbar-export')).toBeVisible()
      await page.getByTestId('toolbar-export').click()
      await expect(page.getByTestId('export-png')).toBeVisible()
      await expect(page.getByTestId('export-pdf')).toBeVisible()
      await page.keyboard.press('Escape')

      await page.reload()
      await expect(page.getByText(workflowSelectionHeading)).toBeVisible()
      await page.getByTestId(`workspace-open-${createdWorkflow.id}`).click()

      await expect(page.getByTestId('toolbar-export')).toBeVisible({ timeout: 15_000 })
      await page.getByTestId('toolbar-export').click()
      await expect(page.getByTestId('export-png')).toBeVisible()
      await expect(page.getByTestId('export-pdf')).toBeVisible()
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})





