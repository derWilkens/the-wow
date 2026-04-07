import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getActivityNodeIds,
  login,
  requireCredentials,
  workflowSelectionHeading,
  workspacesButton,
  testSuffix,
} from './helpers'

test.describe('workspace navigation', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('opens deep detail workflows through the hierarchy explorer search', async ({ page, request }) => {
    test.setTimeout(180_000)
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null
    const rootWorkflowName = `Navigation Root ${testSuffix()}`
    const childWorkflowName = `Navigation Child ${testSuffix()}`
    const childStepOne = `Unterlagen sammeln ${testSuffix()}`
    const childStepTwo = `Entscheidung absichern ${testSuffix()}`

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const rootWorkflow = await createWorkflow(page, rootWorkflowName)
      createdWorkspaceIds.push(rootWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [seededActivityId] = await getActivityNodeIds(page)

      await page.getByTestId(`subprocess-trigger-${seededActivityId}`).click()
      await expect(page.getByTestId('subprocess-menu')).toBeVisible()
      await page.getByTestId('subprocess-menu-create').click()

      await page.getByTestId('subprocess-name').fill(childWorkflowName)
      await page.getByTestId('subprocess-goal').fill('Der Detailablauf soll tiefer in der Navigation erreichbar sein.')
      await page.getByTestId('subprocess-next').click()
      await page.getByTestId('subprocess-inputs').fill('Rechnung')
      await page.getByTestId('subprocess-outputs').fill('Ergebnis')
      await page.getByTestId('subprocess-next').click()
      await page.getByTestId('subprocess-steps').fill(`${childStepOne}\n${childStepTwo}`)

      const createSubprocessResponse = page.waitForResponse((response) => response.url().includes(`/activities/${seededActivityId}/subprocess`) && response.request().method() === 'POST')
      await page.getByTestId('subprocess-submit').click()
      const childPayload = (await (await createSubprocessResponse).json()) as { workspace: { id: string } }
      createdWorkspaceIds.push(childPayload.workspace.id)

      await expect(page.getByText(childStepOne)).toBeVisible({ timeout: 15_000 })
      await page.getByRole('button', { name: workspacesButton }).click()
      await expect(page.getByRole('heading', { name: workflowSelectionHeading })).toBeVisible({ timeout: 15_000 })

      await page.getByPlaceholder('Arbeitsablauf suchen').fill(childWorkflowName)
      await expect(page.getByTestId(`workspace-tree-open-${childPayload.workspace.id}`)).toBeVisible({ timeout: 15_000 })
      await page.getByTestId(`workspace-tree-open-${childPayload.workspace.id}`).click()

      await expect(page.getByText(childStepOne)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`workspace-trail-${rootWorkflow.id}`)).toBeVisible()
      await expect(page.getByTestId(`workspace-trail-${childPayload.workspace.id}`)).toBeVisible()
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})





