import { expect, test } from '@playwright/test'
import { cleanupWorkspaces, createWorkflow, getAccessToken, login, reopenWorkflowAfterReload, testSuffix } from './helpers'

const settingsApiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000'

async function readUserPreference(page: Parameters<typeof test>[0]['page'], key: string) {
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()

  const response = await page.request.get(`${settingsApiBaseUrl}/user-preferences/${encodeURIComponent(key)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    failOnStatusCode: false,
  })

  expect(response.ok()).toBeTruthy()
  const text = await response.text()
  return text ? (JSON.parse(text) as { key: string; value: Record<string, unknown>; updated_at: string } | null) : null
}

async function setUserPreference(page: Parameters<typeof test>[0]['page'], key: string, value: Record<string, unknown>) {
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()

  const response = await page.request.put(`${settingsApiBaseUrl}/user-preferences/${encodeURIComponent(key)}`, {
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

async function readViewportScale(page: Parameters<typeof test>[0]['page']) {
  return page.locator('.react-flow__viewport').evaluate((element) => {
    const transform = window.getComputedStyle(element).transform
    if (!transform || transform === 'none') {
      return 1
    }

    const matrixMatch = transform.match(/^matrix\(([^)]+)\)$/)
    if (matrixMatch) {
      const [scaleX] = matrixMatch[1].split(',').map((entry) => Number(entry.trim()))
      return Number(scaleX.toFixed(2))
    }

    const matrix3dMatch = transform.match(/^matrix3d\(([^)]+)\)$/)
    if (matrix3dMatch) {
      const values = matrix3dMatch[1].split(',').map((entry) => Number(entry.trim()))
      return Number(values[0].toFixed(2))
    }

    const scaleMatch = transform.match(/scale\(([^)]+)\)/)
    if (scaleMatch) {
      return Number(Number(scaleMatch[1]).toFixed(2))
    }

    return 1
  })
}

test.describe('canvas open behavior', () => {
  test('restores the last saved view when enabled and otherwise opens in fit view', async ({ page, request }) => {
    test.setTimeout(70_000)

    const suffix = testSuffix()
    const workflowName = `Canvas Open Workflow ${suffix}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null
    let originalUiPreferences: { key: string; value: Record<string, unknown>; updated_at: string } | null = null
    let originalWorkspaceViewMemory: { key: string; value: Record<string, unknown>; updated_at: string } | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      originalUiPreferences = await readUserPreference(page, 'ui_preferences')
      originalWorkspaceViewMemory = await readUserPreference(page, 'workspace_view_memory')

      await setUserPreference(page, 'ui_preferences', {
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
      await setUserPreference(page, 'workspace_view_memory', {})

      await login(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await page.getByTestId('toolbar-activity').click()
      await expect(page.locator('.wow-node--activity')).toHaveCount(1)

      await setUserPreference(page, 'workspace_view_memory', {
        [workflow.id]: {
          x: 1600,
          y: 1200,
          zoom: 1.37,
        },
      })

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await page.getByTestId('settings-ui-canvas-open-remember-last-view').click()
      await page.getByTestId('settings-ui-save').click()
      await page.getByTestId('settings-dialog-close').click()

      await reopenWorkflowAfterReload(page, workflow.id)
      await page.getByTestId('toolbar-activity').waitFor({ state: 'visible', timeout: 20_000 })
      await expect.poll(() => readViewportScale(page)).toBe(1.37)

      await page.getByTestId('toolbar-settings').click()
      await page.getByTestId('settings-nav-ui').click()
      await page.getByTestId('settings-ui-canvas-open-fit-view').click()
      await page.getByTestId('settings-ui-save').click()
      await page.getByTestId('settings-dialog-close').click()

      await reopenWorkflowAfterReload(page, workflow.id)
      await page.getByTestId('toolbar-activity').waitFor({ state: 'visible', timeout: 20_000 })
      const fitViewScale = await readViewportScale(page)
      expect(fitViewScale).not.toBe(1.37)
    } finally {
      if (originalUiPreferences) {
        await setUserPreference(page, 'ui_preferences', originalUiPreferences.value).catch(() => undefined)
      }
      if (originalWorkspaceViewMemory) {
        await setUserPreference(page, 'workspace_view_memory', originalWorkspaceViewMemory.value).catch(() => undefined)
      } else {
        await setUserPreference(page, 'workspace_view_memory', {}).catch(() => undefined)
      }
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
