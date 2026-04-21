import { expect, test, type Page } from '@playwright/test'
import { cleanupWorkspaces, createWorkflow, getAccessToken, login, reopenWorkflowAfterReload, testSuffix } from './helpers'

const settingsApiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000'

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

test.describe('theme preferences', () => {
  test('persists light, dark and system theme modes via user preferences', async ({ page, request }) => {
    test.setTimeout(60_000)

    const suffix = testSuffix()
    const workflowName = `Theme Pref Workflow ${suffix}`
    const createdWorkspaceIds: string[] = []

    try {
      await login(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)
      await page.getByTestId('toolbar-activity').waitFor({ state: 'visible', timeout: 20_000 })
      await page.getByTestId('toolbar-activity').click()
      await expect(page.locator('.wow-node--activity')).toHaveCount(1)

      const originalPreferences = await readUiPreferences(page)

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await page.getByTestId('settings-ui-theme-light').click()
      await page.getByTestId('settings-ui-save').click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      await expect
        .poll(async () => page.locator('.wow-workflow-canvas-surface').evaluate((element) => window.getComputedStyle(element).backgroundImage))
        .toContain('248, 249, 251')
      await expect
        .poll(async () => page.locator('.wow-node--activity').first().evaluate((element) => window.getComputedStyle(element).backgroundColor))
        .toContain('255')
      await page.getByTestId('settings-dialog-close').click()

      const lightPreferences = await readUiPreferences(page)
      expect(lightPreferences?.value.theme_mode).toBe('light')

      await reopenWorkflowAfterReload(page, workflow.id)
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await expect(page.getByTestId('settings-ui-theme-light')).toHaveClass(/bg-\[var\(--wow-primary\)\]/)
      await page.getByTestId('settings-ui-theme-dark').click()
      await page.getByTestId('settings-ui-save').click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await expect
        .poll(async () => page.locator('.wow-workflow-canvas-surface').evaluate((element) => window.getComputedStyle(element).backgroundImage))
        .toContain('8, 18, 27')
      await expect
        .poll(async () => page.locator('.wow-node--activity').first().evaluate((element) => window.getComputedStyle(element).backgroundColor))
        .toContain('10, 24, 37')
      await page.getByTestId('settings-dialog-close').click()

      const darkPreferences = await readUiPreferences(page)
      expect(darkPreferences?.value.theme_mode).toBe('dark')

      await reopenWorkflowAfterReload(page, workflow.id)
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await expect(page.getByTestId('settings-ui-theme-dark')).toHaveClass(/bg-\[var\(--wow-primary\)\]/)
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
      await expect(page.getByTestId('settings-ui-theme-system')).toHaveClass(/bg-\[var\(--wow-primary\)\]/)
      await page.getByTestId('settings-dialog-close').click()

      if (originalPreferences) {
        await setUiPreferences(page, originalPreferences.value)
      }
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, await getAccessToken(page).catch(() => null))
    }
  })
})
