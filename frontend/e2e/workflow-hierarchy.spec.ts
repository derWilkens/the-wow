import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getActiveOrganizationId,
  getAccessToken,
  getActivityNodeIds,
  getStartNodeIds,
  login,
  reopenWorkflowAfterReload,
  requireCredentials,
  workspacesButton,
  testSuffix,
} from './helpers'

test.describe('workflow hierarchy', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('creates and links subprocess workflows, then cleans up all created workspaces', async ({ page, request }) => {
    test.setTimeout(60_000)
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null
    let activeOrganizationId: string | null = null
    const rootWorkflowName = `Arbeitsablauf ${testSuffix()}`
    const subprocessName = `Freigabe im Detail ${testSuffix()}`
    const subprocessGoal = 'Der Schritt soll alle Unterlagen pruefen und eine belastbare Freigabe zurueckgeben.'
    const subprocessStepOne = `Unterlagen pruefen ${testSuffix()}`
    const subprocessStepTwo = `Abweichungen klaeren ${testSuffix()}`

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdRootWorkflow = await createWorkflow(page, rootWorkflowName)
      createdWorkspaceIds.push(createdRootWorkflow.id)

      await expect.poll(async () => (await getStartNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      const [seededActivityId] = await getActivityNodeIds(page)
      await expect(page.getByTestId(`subprocess-trigger-${seededActivityId}`)).toBeVisible()
      await page.getByTestId(`subprocess-trigger-${seededActivityId}`).click()
      await expect(page.getByTestId('subprocess-menu')).toBeVisible()
      await page.getByTestId('subprocess-menu-create').click()

      await expect(page.getByTestId('subprocess-wizard')).toBeVisible()
      await page.getByTestId('subprocess-name').fill(subprocessName)
      await page.getByTestId('subprocess-goal').fill(subprocessGoal)
      await page.getByTestId('subprocess-next').click()
      await page.getByTestId('subprocess-inputs').fill('Rechnungsdaten\nPruefregeln')
      await page.getByTestId('subprocess-outputs').fill('Freigabe\nKlaerungsbedarf')
      await page.getByTestId('subprocess-next').click()
      await page.getByTestId('subprocess-steps').fill(`${subprocessStepOne}\n${subprocessStepTwo}`)

      const createSubprocessResponse = page.waitForResponse((response) => response.url().includes(`/activities/${seededActivityId}/subprocess`) && response.request().method() === 'POST')
      await page.getByTestId('subprocess-submit').click()
      const createSubprocessPayload = (await (await createSubprocessResponse).json()) as { workspace: { id: string; name: string } }
      createdWorkspaceIds.push(createSubprocessPayload.workspace.id)

      await expect(page.getByTestId(`workspace-trail-${createSubprocessPayload.workspace.id}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(subprocessStepOne)).toBeVisible({ timeout: 15_000 })

      await page.getByTestId(`workspace-trail-${createdRootWorkflow.id}`).click({ force: true })
      await expect.poll(async () => (await getStartNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      await expect(page.getByTestId(`subprocess-trigger-${seededActivityId}`)).toHaveAttribute('data-subprocess-state', 'linked')

      await page.getByRole('button', { name: workspacesButton }).click()
      await page.getByTestId(`workspace-open-${createdRootWorkflow.id}`).click()
      await expect(page.getByTestId(`activity-node-${seededActivityId}`)).toBeVisible()

      const existingActivityIds = await getActivityNodeIds(page)
      await page.getByTestId('toolbar-activity').click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(existingActivityIds.length + 1)
      const updatedActivityIds = await getActivityNodeIds(page)
      const linkTargetActivityId = updatedActivityIds.find((id) => !existingActivityIds.includes(id))
      expect(linkTargetActivityId).toBeTruthy()

      await expect(page.getByTestId(`subprocess-trigger-${linkTargetActivityId!}`)).toBeVisible()
      await page.getByTestId(`subprocess-trigger-${linkTargetActivityId!}`).click()
      await expect(page.getByTestId('subprocess-menu')).toBeVisible()
      await page.getByTestId('subprocess-menu-link').click()
      await expect(page.getByTestId('link-workflow-modal')).toBeVisible()
      await page.getByTestId(`link-workflow-option-${createSubprocessPayload.workspace.id}`).click()
      await page.getByTestId('link-workflow-submit').click()
      await expect(page.getByTestId('link-workflow-modal')).toHaveCount(0, { timeout: 15_000 })
      await expect(page.getByText(subprocessStepOne)).toBeVisible({ timeout: 15_000 })
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })

  test('reconstructs linked workflow navigation and breadcrumb after a full page reload', async ({ page, request }) => {
    test.setTimeout(60_000)
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null
    let activeOrganizationId: string | null = null
    const rootWorkflowName = `Arbeitsablauf Reload ${testSuffix()}`
    const childWorkflowName = `Pruefung im Detail ${testSuffix()}`
    const childGoal = 'Der Detailablauf soll die Unterlagen pruefen und ein klares Ergebnis liefern.'
    const childStepOne = `Unterlagen sichten ${testSuffix()}`
    const childStepTwo = `Ergebnis dokumentieren ${testSuffix()}`

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const createdRootWorkflow = await createWorkflow(page, rootWorkflowName)
      createdWorkspaceIds.push(createdRootWorkflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [seededActivityId] = await getActivityNodeIds(page)

      await expect(page.getByTestId(`subprocess-trigger-${seededActivityId}`)).toBeVisible()
      await page.getByTestId(`subprocess-trigger-${seededActivityId}`).click()
      await expect(page.getByTestId('subprocess-menu')).toBeVisible()
      await page.getByTestId('subprocess-menu-create').click()

      await expect(page.getByTestId('subprocess-wizard')).toBeVisible()
      await page.getByTestId('subprocess-name').fill(childWorkflowName)
      await page.getByTestId('subprocess-goal').fill(childGoal)
      await page.getByTestId('subprocess-next').click()
      await page.getByTestId('subprocess-inputs').fill('Rechnung\nPruefkriterien')
      await page.getByTestId('subprocess-outputs').fill('Pruefergebnis\nRueckfragen')
      await page.getByTestId('subprocess-next').click()
      await page.getByTestId('subprocess-steps').fill(`${childStepOne}\n${childStepTwo}`)

      const createSubprocessResponse = page.waitForResponse((response) => response.url().includes(`/activities/${seededActivityId}/subprocess`) && response.request().method() === 'POST')
      await page.getByTestId('subprocess-submit').click()
      const createSubprocessPayload = (await (await createSubprocessResponse).json()) as { workspace: { id: string; name: string } }
      createdWorkspaceIds.push(createSubprocessPayload.workspace.id)

      await expect(page.getByTestId(`workspace-trail-${createSubprocessPayload.workspace.id}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(childStepOne)).toBeVisible({ timeout: 15_000 })
      activeOrganizationId = await getActiveOrganizationId(page)

      if (activeOrganizationId) {
        await page.evaluate((organizationId) => {
          window.localStorage.setItem('wow-active-organization-id', organizationId)
        }, activeOrganizationId)
      }
      await reopenWorkflowAfterReload(page, createdRootWorkflow.id)

      await expect(page.getByTestId(`activity-node-${seededActivityId}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`subprocess-trigger-${seededActivityId}`)).toHaveAttribute('data-subprocess-state', 'linked')

      await page.getByTestId(`subprocess-trigger-${seededActivityId}`).click()
      await expect(page.getByTestId('subprocess-menu-open')).toBeVisible({ timeout: 15_000 })
      await page.getByTestId('subprocess-menu-open').click()

      await expect(page.getByTestId(`workspace-trail-${createdRootWorkflow.id}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`workspace-trail-${createSubprocessPayload.workspace.id}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(childStepOne)).toBeVisible({ timeout: 15_000 })

      await page.getByTestId(`workspace-trail-${createdRootWorkflow.id}`).click({ force: true })
      await expect(page.getByTestId(`activity-node-${seededActivityId}`)).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId(`subprocess-trigger-${seededActivityId}`)).toHaveAttribute('data-subprocess-state', 'linked')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})






