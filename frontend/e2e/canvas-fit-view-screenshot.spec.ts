import { expect, test } from '@playwright/test'
import { mkdirSync } from 'fs'
import { resolve } from 'path'
import { cleanupWorkspaces, createWorkflow, getAccessToken, login, reopenWorkflowAfterReload, testSuffix } from './helpers'

const settingsApiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000'
const screenshotPath = resolve(process.cwd(), 'test-results', 'canvas-fit-view-open.png')

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

async function createActivity(
  request: Parameters<typeof test>[0]['request'],
  accessToken: string,
  workspaceId: string,
  input: { label: string; x: number; y: number },
) {
  const response = await request.post(`${settingsApiBaseUrl}/workspaces/${workspaceId}/activities/upsert`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      parent_id: null,
      node_type: 'activity',
      label: input.label,
      trigger_type: null,
      position_x: input.x,
      position_y: input.y,
      status: 'draft',
      status_icon: null,
      activity_type: null,
      description: null,
      notes: null,
      duration_minutes: null,
      linked_workflow_id: null,
      linked_workflow_mode: null,
      linked_workflow_purpose: null,
      linked_workflow_inputs: [],
      linked_workflow_outputs: [],
      role_id: null,
      assignee_label: null,
    },
    failOnStatusCode: false,
  })

  expect(response.ok()).toBeTruthy()
}

test.describe('canvas fit view screenshot', () => {
  test('captures the opened workflow in fit view', async ({ page, request }) => {
    test.setTimeout(70_000)

    mkdirSync(resolve(process.cwd(), 'test-results'), { recursive: true })

    const suffix = testSuffix()
    const workflowName = `Fit View Screenshot ${suffix}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    await login(page)
    accessToken = await getAccessToken(page)
    expect(accessToken).toBeTruthy()

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

    try {
      await login(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await createActivity(request, accessToken!, workflow.id, { label: 'Links oben', x: 80, y: 80 })
      await createActivity(request, accessToken!, workflow.id, { label: 'Rechts oben', x: 1700, y: 120 })
      await createActivity(request, accessToken!, workflow.id, { label: 'Links unten', x: 140, y: 1020 })
      await createActivity(request, accessToken!, workflow.id, { label: 'Rechts unten', x: 1760, y: 1080 })

      await reopenWorkflowAfterReload(page, workflow.id)
      await page.getByTestId('toolbar-activity').waitFor({ state: 'visible', timeout: 20_000 })
      await expect(page.locator('.wow-node--activity')).toHaveCount(4)

      const canvas = page.getByTestId('workflow-canvas')
      await expect(canvas).toBeVisible()
      await canvas.screenshot({ path: screenshotPath })
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
