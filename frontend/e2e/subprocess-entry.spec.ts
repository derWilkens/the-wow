import { expect, test, type Page } from '@playwright/test'
import {
  cleanupOrganizationsByNames,
  cleanupWorkspaces,
  createTestUser,
  createWorkflow,
  deleteUserByEmail,
  ensurePostLoginLanding,
  getAccessToken,
  getActivityNodeIds,
  getStartNodeIds,
  loginAs,
  requireCredentials,
  testSuffix,
} from './helpers'

async function createScenarioUserAndOrganization(page: Page, suffix: number) {
  const userEmail = `subprocess-entry-${suffix}@mailinator.com`
  const userPassword = 'CodexSaaS!2026'
  const organizationName = `Subprocess Entry Org ${suffix}`

  await deleteUserByEmail(userEmail).catch(() => Promise.resolve())
  await createTestUser(userEmail, userPassword)
  await loginAs(page, userEmail, userPassword)

  await expect(page.getByRole('heading', { name: /Firma anlegen|Create organization/i })).toBeVisible({ timeout: 20_000 })
  await page.getByPlaceholder(/Name der Firma|Organization name/i).fill(organizationName)
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/organizations') && response.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await page.getByTestId('organization-create-submit').click()
  const response = await responsePromise
  expect(response.ok()).toBeTruthy()
  const createdOrganization = (await response.json()) as { id: string; name: string }
  await page.evaluate((organizationId) => {
    window.localStorage.setItem('wow-active-organization-id', organizationId)
  }, createdOrganization.id)
  await page.reload()
  await ensurePostLoginLanding(page, userEmail)

  return { userEmail, organizationName }
}

async function createConnectedActivity(page: Page, sourceActivityId: string) {
  const existingIds = await getActivityNodeIds(page)
  await page.getByTestId(`activity-node-${sourceActivityId}`).click()
  await page.getByTestId('toolbar-activity').click()
  await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(existingIds.length + 1)
  const nextId = (await getActivityNodeIds(page)).find((id) => !existingIds.includes(id))
  expect(nextId).toBeTruthy()
  return nextId!
}

test.describe('subprocess entry', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('opens the subprocess menu reliably on a later activity in a dense workflow', async ({ page, request }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const workflowName = `Subprocess Entry ${suffix}`
    const createdWorkspaceIds: string[] = []
    const createdOrganizationNames: string[] = []
    let scenarioUserEmail: string | null = null
    let accessToken: string | null = null

    try {
      const scenario = await createScenarioUserAndOrganization(page, suffix)
      scenarioUserEmail = scenario.userEmail
      createdOrganizationNames.push(scenario.organizationName)

      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getStartNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      let currentActivityId = (await getActivityNodeIds(page))[0]
      for (let index = 0; index < 7; index += 1) {
        currentActivityId = await createConnectedActivity(page, currentActivityId)
      }

      const targetActivityId = currentActivityId
      const trigger = page.getByTestId(`subprocess-trigger-${targetActivityId}`)
      const menu = page.getByTestId('subprocess-menu')

      await page.getByTestId(`activity-node-${targetActivityId}`).click({ force: true })
      await trigger.click({ force: true })
      if (!(await menu.isVisible({ timeout: 2_000 }).catch(() => false))) {
        await trigger.dispatchEvent('click')
      }

      await expect(menu).toBeVisible({ timeout: 15_000 })
      await page.getByTestId('subprocess-menu-create').click()
      await expect(page.getByTestId('subprocess-wizard')).toBeVisible({ timeout: 15_000 })
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupOrganizationsByNames(createdOrganizationNames)
      if (scenarioUserEmail) {
        await deleteUserByEmail(scenarioUserEmail).catch(() => Promise.resolve())
      }
    }
  })
})



