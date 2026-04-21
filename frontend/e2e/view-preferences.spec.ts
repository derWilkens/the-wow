import { expect, test } from '@playwright/test'
import { cleanupWorkspaces, createWorkflow, getAccessToken, login, testSuffix } from './helpers'

const settingsApiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000'

async function readUiPreferences(page: Parameters<typeof test>[0]['page']) {
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()

  const response = await page.request.get(`${settingsApiBaseUrl}/user-preferences/ui_preferences`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    failOnStatusCode: false,
  })

  expect(response.ok()).toBeTruthy()
  const text = await response.text()
  return text ? (JSON.parse(text) as { key: string; value: Record<string, unknown>; updated_at: string } | null) : null
}

async function setUiPreferences(page: Parameters<typeof test>[0]['page'], value: Record<string, unknown>) {
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()

  const response = await page.request.put(`${settingsApiBaseUrl}/user-preferences/ui_preferences`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      preference_value: value,
    },
    failOnStatusCode: false,
  })

  expect(response.ok()).toBeTruthy()
}

test.describe('view preferences', () => {
  test('hides optional header controls by default and toggles them through settings', async ({ page, request }) => {
    test.setTimeout(60_000)

    const suffix = testSuffix()
    const workflowName = `View Pref Workflow ${suffix}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null
    let originalPreferences: { key: string; value: Record<string, unknown>; updated_at: string } | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      originalPreferences = await readUiPreferences(page)
      await setUiPreferences(page, {
        default_grouping_mode: 'free',
        canvas_open_behavior: 'fit_view',
        snap_to_grid: true,
        enable_table_view: false,
        enable_swimlane_view: false,
        enable_node_collision_avoidance: true,
        enable_alignment_guides: true,
        enable_magnetic_connection_targets: true,
        theme_mode: 'system',
      })
      await login(page)
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

      const defaultPreferences = await readUiPreferences(page)
      if (defaultPreferences) {
        expect(defaultPreferences.value.enable_table_view).toBe(false)
        expect(defaultPreferences.value.enable_swimlane_view).toBe(false)
      }

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await page.getByTestId('settings-ui-table-view-on').click()
      await page.getByTestId('settings-ui-swimlane-on').click()
      const enablePreferencesResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/user-preferences/ui_preferences') &&
          response.request().method() === 'PUT',
        { timeout: 15_000 },
      )
      await page.getByTestId('settings-ui-save').click()
      expect((await enablePreferencesResponse).ok()).toBe(true)
      await page.getByTestId('settings-dialog-close').click()

      await expect(page.getByTestId('toolbar-view-sipoc')).toBeVisible()
      await expect(page.getByTestId('toolbar-grouping-toggle')).toBeVisible()
      await expect(page.getByTestId('toolbar-canvas-search')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-export')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-undo')).toHaveCount(1)
      await expect(page.getByTestId('toolbar-redo')).toHaveCount(1)

      const enabledPreferences = await readUiPreferences(page)
      expect(enabledPreferences?.value.enable_table_view).toBe(true)
      expect(enabledPreferences?.value.enable_swimlane_view).toBe(true)

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await page.getByTestId('settings-ui-table-view-off').click()
      await page.getByTestId('settings-ui-swimlane-off').click()
      const disablePreferencesResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/user-preferences/ui_preferences') &&
          response.request().method() === 'PUT',
        { timeout: 15_000 },
      )
      await page.getByTestId('settings-ui-save').click()
      expect((await disablePreferencesResponse).ok()).toBe(true)
      await page.getByTestId('settings-dialog-close').click()

      await expect(page.getByTestId('toolbar-view-canvas')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-view-sipoc')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-grouping-toggle')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-canvas-search')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-export')).toHaveCount(0)
      await expect(page.getByTestId('toolbar-undo')).toHaveCount(1)
      await expect(page.getByTestId('toolbar-redo')).toHaveCount(1)

      const disabledPreferences = await readUiPreferences(page)
      expect(disabledPreferences?.value.enable_table_view).toBe(false)
      expect(disabledPreferences?.value.enable_swimlane_view).toBe(false)
    } finally {
      if (originalPreferences) {
        await setUiPreferences(page, originalPreferences.value).catch(() => undefined)
      }
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})

