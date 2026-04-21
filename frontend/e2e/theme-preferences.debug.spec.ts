import { expect, test, type Page } from '@playwright/test'
import { cleanupWorkspaces, createWorkflow, getAccessToken, login, reopenWorkflowAfterReload, testSuffix } from './helpers'

const settingsApiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000'

test.skip(!process.env.PW_DEBUG_BREAKPOINTS, 'Debug-only spec. Start via the dedicated headed debug command.')

async function readUiPreferences(page: Page) {
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

async function setUiPreferences(page: Page, value: Record<string, unknown>) {
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

async function debugPause(page: Page, label: string) {
  console.log(`\n[playwright-debug] ${label}\n`)
  await page.pause()
}

test.describe('theme preferences debug', () => {
  test('headed debugger flow with manual breakpoints for theme persistence', async ({ page, request }) => {
    test.setTimeout(0)

    const suffix = testSuffix()
    const workflowName = `Theme Debug Workflow ${suffix}`
    const createdWorkspaceIds: string[] = []

    try {
      await login(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)
      await page.getByTestId('toolbar-activity').waitFor({ state: 'visible', timeout: 20_000 })

      const originalPreferences = await readUiPreferences(page)

      await debugPause(page, 'Checkpoint 1: eingeloggt, Workflow offen, Ausgangszustand vor Theme-Aenderung')

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await debugPause(page, 'Checkpoint 2: Settings offen im UI-Tab, vor Wechsel auf Hell')

      await page.getByTestId('settings-ui-theme-light').click()
      await page.getByTestId('settings-ui-save').click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      await debugPause(page, 'Checkpoint 3: Hell gespeichert und aktiv, vor Reload')
      await page.getByTestId('settings-dialog-close').click()

      const lightPreferences = await readUiPreferences(page)
      expect(lightPreferences?.value.theme_mode).toBe('light')

      await reopenWorkflowAfterReload(page, workflow.id)
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await expect(page.getByTestId('settings-ui-theme-light')).toHaveClass(/bg-cyan-400/)
      await debugPause(page, 'Checkpoint 4: Nach Reload weiterhin Hell, vor Wechsel auf Dunkel')

      await page.getByTestId('settings-ui-theme-dark').click()
      await page.getByTestId('settings-ui-save').click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await debugPause(page, 'Checkpoint 5: Dunkel gespeichert und aktiv, vor zweitem Reload')
      await page.getByTestId('settings-dialog-close').click()

      const darkPreferences = await readUiPreferences(page)
      expect(darkPreferences?.value.theme_mode).toBe('dark')

      await reopenWorkflowAfterReload(page, workflow.id)
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await expect(page.getByTestId('settings-ui-theme-dark')).toHaveClass(/bg-cyan-400/)

      await page.getByTestId('settings-ui-theme-system').click()
      await page.getByTestId('settings-ui-save').click()
      await page.getByTestId('settings-dialog-close').click()

      const systemPreferences = await readUiPreferences(page)
      expect(systemPreferences?.value.theme_mode).toBe('system')

      await reopenWorkflowAfterReload(page, workflow.id)
      const resolvedTheme = await page.locator('html').getAttribute('data-theme')
      expect(['light', 'dark']).toContain(resolvedTheme)
      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await expect(page.getByTestId('settings-ui-theme-system')).toHaveClass(/bg-cyan-400/)
      await debugPause(page, 'Checkpoint 6: System gespeichert und nach Reload korrekt aufgeloest')
      await page.getByTestId('settings-dialog-close').click()

      if (originalPreferences) {
        await setUiPreferences(page, originalPreferences.value)
      }
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, await getAccessToken(page).catch(() => null))
    }
  })
})
