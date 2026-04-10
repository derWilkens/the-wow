import { expect, test } from '@playwright/test'
import { cleanupWorkspaces, createWorkflow, getAccessToken, login, requireCredentials, testSuffix } from './helpers'

test.describe('workflow details', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('opens and saves the current workflow from the header', async ({ page, request }) => {
    test.setTimeout(60_000)
    const workflowName = `Workflow Detail ${testSuffix()}`
    const renamedWorkflowName = `${workflowName} Update`
    const workflowPurpose = `Wirkung ${testSuffix(321)}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)

      const createdWorkflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(createdWorkflow.id)

      await page.getByTestId('toolbar-workflow-details').click()
      await expect(page.getByTestId('workflow-detail-dialog')).toBeVisible()
      await expect(page.getByTestId('workflow-detail-name')).toHaveValue(workflowName)

      const patchResponse = page.waitForResponse(
        (response) => response.url().includes(`/workspaces/${createdWorkflow.id}`) && response.request().method() === 'PATCH',
      )
      await page.getByTestId('workflow-detail-name').fill(renamedWorkflowName)
      await page.getByTestId('workflow-detail-purpose').fill(workflowPurpose)
      await page.getByTestId('workflow-detail-inputs').fill('Anfrage\nUnterlagen')
      await page.getByTestId('workflow-detail-outputs').fill('Freigabe')
      await page.getByTestId('workflow-detail-save').click()
      const response = await patchResponse
      expect(response.ok()).toBeTruthy()
      await expect(page.getByTestId('workflow-detail-dialog')).toHaveCount(0)

      await page.reload()
      await login(page)
      await expect(page.getByTestId(`workspace-open-${createdWorkflow.id}`)).toContainText(renamedWorkflowName)
      await page.getByTestId(`workspace-open-${createdWorkflow.id}`).click()
      await page.getByTestId('toolbar-workflow-details').click()
      await expect(page.getByTestId('workflow-detail-name')).toHaveValue(renamedWorkflowName)
      await expect(page.getByTestId('workflow-detail-purpose')).toHaveValue(workflowPurpose)
      await expect(page.getByTestId('workflow-detail-inputs')).toHaveValue('Anfrage\nUnterlagen')
      await expect(page.getByTestId('workflow-detail-outputs')).toHaveValue('Freigabe')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})

