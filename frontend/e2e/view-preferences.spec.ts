import { expect, test } from '@playwright/test'
import { cleanupOrganizationsByNames, cleanupWorkspaces, createWorkflow, getAccessToken, loginAs, testSuffix } from './helpers'

const settingsUserEmail = '2@derwilkens.de'
const settingsUserPassword = 'Wilkens:)'
const settingsApiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000'

async function loginForViewPreferences(page: Parameters<typeof test>[0]['page']) {
  await loginAs(page, settingsUserEmail, settingsUserPassword)
  await Promise.race([
    page.getByRole('heading', { name: /Firma ausw|Firma anlegen/i }).waitFor({ state: 'visible', timeout: 20_000 }),
    page.getByRole('heading', { name: /Arbeitsablauf ausw/i }).waitFor({ state: 'visible', timeout: 20_000 }),
    page.getByTestId('toolbar-activity').waitFor({ state: 'visible', timeout: 20_000 }),
  ])
  await expect.poll(async () => getAccessToken(page), { timeout: 20_000 }).toBeTruthy()
}

async function createOrganizationForSession(page: Parameters<typeof test>[0]['page'], organizationName: string) {
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()

  const response = await page.request.post(`${settingsApiBaseUrl}/organizations`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      name: organizationName,
    },
  })

  expect(response.ok()).toBeTruthy()
  const organization = (await response.json()) as { id: string; name: string }

  await page.evaluate((organizationId) => {
    window.localStorage.setItem('wow-active-organization-id', organizationId)
  }, organization.id)
  await page.reload()
  await page.getByTestId(`organization-select-${organization.id}`).click()
  await page.getByRole('heading', { name: /Arbeitsablauf ausw/i }).waitFor({ state: 'visible', timeout: 20_000 })

  return organization
}

test.describe('view preferences', () => {
  test('hides optional header controls by default and toggles them through settings', async ({ page, request }) => {
    test.setTimeout(60_000)

    const suffix = testSuffix()
    const organizationName = `View Pref Org ${suffix}`
    const workflowName = `View Pref Workflow ${suffix}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await loginForViewPreferences(page)
      await createOrganizationForSession(page, organizationName)
      accessToken = await getAccessToken(page)

      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)
      await page.getByTestId('toolbar-activity').waitFor({ state: 'visible', timeout: 20_000 })

      await expect(page.getByTestId('toolbar-undo')).toHaveCount(1)
      await expect(page.getByTestId('toolbar-redo')).toHaveCount(1)
      await expect(page.getByTestId('toolbar-view-canvas')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-view-sipoc')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-grouping-toggle')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-canvas-search')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-export')).toHaveCount(0)

      const defaultPreferences = await page.evaluate(() => window.localStorage.getItem('wow-ui-preferences'))
      expect(defaultPreferences === null || defaultPreferences.includes('"enable_table_view":false')).toBeTruthy()
      expect(defaultPreferences === null || defaultPreferences.includes('"enable_swimlane_view":false')).toBeTruthy()

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await page.getByTestId('settings-ui-table-view-on').click()
      await page.getByTestId('settings-ui-swimlane-on').click()
      await page.getByTestId('settings-ui-save').click()
      await page.getByTestId('settings-dialog-close').click()

      await expect(page.getByTestId('toolbar-view-sipoc')).toBeVisible()
      await expect(page.getByTestId('toolbar-grouping-toggle')).toBeVisible()
      await expect(page.getByTestId('toolbar-canvas-search')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-export')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-undo')).toHaveCount(1)
      await expect(page.getByTestId('toolbar-redo')).toHaveCount(1)

      const enabledPreferences = await page.evaluate(() => window.localStorage.getItem('wow-ui-preferences'))
      expect(enabledPreferences).toContain('"enable_table_view":true')
      expect(enabledPreferences).toContain('"enable_swimlane_view":true')

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await page.getByTestId('settings-ui-table-view-off').click()
      await page.getByTestId('settings-ui-swimlane-off').click()
      await page.getByTestId('settings-ui-save').click()
      await page.getByTestId('settings-dialog-close').click()

      await expect(page.getByTestId('toolbar-view-canvas')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-view-sipoc')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-grouping-toggle')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-canvas-search')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-export')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-undo')).toHaveCount(1)
      await expect(page.getByTestId('toolbar-redo')).toHaveCount(1)

      const disabledPreferences = await page.evaluate(() => window.localStorage.getItem('wow-ui-preferences'))
      expect(disabledPreferences).toContain('"enable_table_view":false')
      expect(disabledPreferences).toContain('"enable_swimlane_view":false')
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupOrganizationsByNames([organizationName])
    }
  })
})

