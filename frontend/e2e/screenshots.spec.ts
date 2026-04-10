import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import {
  cleanupOrganizationsByNames,
  createWorkflow,
  deleteUserByEmail,
  getAccessToken,
  getActivityNodeIds,
  getGatewayNodeIds,
  openActivityDetail,
  selectEdgeByIndex,
  selectFirstEdge,
  signupAndLogin,
  updateUiPreferences,
  testSuffix,
} from './helpers'

const currentDir = dirname(fileURLToPath(import.meta.url))
const screenshotDir = resolve(currentDir, '../../docs/screenshots')

async function createOrganizationForScreenshots(page: Page, suffix: number) {
  const organizationName = `Screenshots GmbH ${suffix}`
  await page.getByPlaceholder('Name der Firma').fill(organizationName)
  await page.getByRole('button', { name: /^Firma anlegen$/i }).click()
  await expect(page.getByRole('heading', { name: /Arbeitsablauf ausw/i })).toBeVisible({ timeout: 20_000 })
  return organizationName
}

async function createScreenshotUser(page: Page, suffix: number) {
  const userEmail = `screenshots-${suffix}@mailinator.com`
  const userPassword = 'CodexSaaS!2026'
  await deleteUserByEmail(userEmail)
  await signupAndLogin(page, userEmail, userPassword)
  return { userEmail, userPassword }
}

test.describe('screenshots', () => {
  test.beforeEach(() => {
    mkdirSync(screenshotDir, { recursive: true })
  })

  test('captures workspace list and template save dialog', async ({ page }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const { userEmail } = await createScreenshotUser(page, suffix)
    const organizationName = await createOrganizationForScreenshots(page, suffix)

    try {
      await page.getByTestId('workspace-create-mode-template').click()
      await expect(page.getByText(/Standard|Eigene Vorlage/i).first()).toBeVisible({ timeout: 20_000 })
      await page.screenshot({
        path: resolve(screenshotDir, '01-workspace-list.png'),
        fullPage: true,
      })

      await page.getByTestId('workspace-create-mode-blank').click()
      const workflow = await createWorkflow(page, `Vorlagen Basis ${suffix}`)
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 20_000 })
      await page.getByTestId('toolbar-back-to-workspaces').click()
      await expect(page.getByRole('heading', { name: /Arbeitsablauf ausw/i })).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-save-template-${workflow.id}`).click()
      await expect(page.getByTestId('workspace-template-save')).toBeVisible({ timeout: 10_000 })
      await page.screenshot({
        path: resolve(screenshotDir, '02-template-save-dialog.png'),
        fullPage: true,
      })
    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })

  test('captures canvas free mode, role lanes, and activity detail', async ({ page }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const { userEmail } = await createScreenshotUser(page, suffix)
    const organizationName = await createOrganizationForScreenshots(page, suffix)

    try {
      const workflow = await createWorkflow(page, `Canvas Basis ${suffix}`)
      void workflow
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 20_000 })
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 20_000 }).toBe(1)

      await page.screenshot({
        path: resolve(screenshotDir, '03-canvas-free.png'),
        fullPage: true,
      })

      const [activityId] = await getActivityNodeIds(page)
      await openActivityDetail(page, activityId)
      await page.getByTestId('activity-assignee-select-trigger').click().catch(() => Promise.resolve())
      await page.locator('[data-testid^="activity-assignee-select-option-"]').first().click().catch(() => Promise.resolve())
      await page.getByTestId('activity-comment-input').fill('Bitte auf Vollstaendigkeit pruefen.')
      await page.getByTestId('activity-comment-submit').click()
      await expect(page.getByText('Bitte auf Vollstaendigkeit pruefen.')).toBeVisible({ timeout: 10_000 })
      await page.screenshot({
        path: resolve(screenshotDir, '05-activity-detail.png'),
        fullPage: true,
      })
      await page.getByTestId('activity-detail-save').click()
      await expect(page.locator(`[data-testid="activity-detail-${activityId}"]`)).toHaveCount(0)

      await updateUiPreferences(page, { enable_swimlane_view: true })
      await page.reload()
      await expect(page.getByTestId(`workspace-open-${workflow.id}`)).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-open-${workflow.id}`).click()
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 20_000 })
      await page.getByTestId('toolbar-grouping-toggle').click()
      await expect(page.getByTestId('role-lane-overlay')).toBeVisible({ timeout: 10_000 })
      await page.screenshot({
        path: resolve(screenshotDir, '04-canvas-role-lanes.png'),
        fullPage: true,
      })
    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })

  test('captures edge detail, data object detail, and settings', async ({ page, request }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const { userEmail } = await createScreenshotUser(page, suffix)
    const organizationName = await createOrganizationForScreenshots(page, suffix)

    try {
      const workflowName = `Kanten Basis ${suffix}`
      const workflow = await createWorkflow(page, workflowName)
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 20_000 })
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 20_000 }).toBe(1)
      const accessToken = await getAccessToken(page)
      expect(accessToken).toBeTruthy()

      const edgesResponse = await request.get(`http://127.0.0.1:3000/workspaces/${workflow.id}/canvas-edges`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      expect(edgesResponse.ok()).toBeTruthy()
      const edges = (await edgesResponse.json()) as Array<{ id: string }>
      expect(edges.length).toBeGreaterThan(0)
      const [firstEdge] = edges

      const dataObjectResponse = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/canvas-objects/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          parent_activity_id: null,
          object_type: 'datenobjekt',
          name: 'Gepruefte Rechnung',
          edge_id: firstEdge.id,
          edge_sort_order: 0,
          fields: [],
        },
      })
      expect(dataObjectResponse.ok()).toBeTruthy()

      await page.reload()
      await expect(page.getByRole('heading', { name: /Arbeitsablauf ausw/i })).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-open-${workflow.id}`).click()
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 20_000 })

      await selectFirstEdge(page)
      await expect(page.getByTestId('edge-transport-mode-trigger')).toBeVisible({ timeout: 10_000 })
      await page.getByTestId('edge-transport-mode-trigger').click()
      const choiceOptions = page.locator('[data-testid^="edge-transport-mode-option-"]')
      if ((await choiceOptions.count()) > 0) {
        await choiceOptions.first().click()
      }
      await expect(page.getByTestId(/^edge-data-object-row-/).getByText('Gepruefte Rechnung')).toBeVisible({ timeout: 10_000 })
      await page.screenshot({
        path: resolve(screenshotDir, '06-edge-detail.png'),
        fullPage: true,
      })

      await page.locator('[data-testid^="edge-open-data-object-"]').first().click()
      await expect(page.getByTestId('data-object-name')).toBeVisible({ timeout: 10_000 })
      await page.screenshot({
        path: resolve(screenshotDir, '07-data-object-detail.png'),
        fullPage: true,
      })
      await page.getByTestId('data-object-close').click()

      await page.getByTestId('toolbar-settings').click()
      await expect(page.getByTestId('transport-mode-create')).toBeVisible({ timeout: 10_000 })
      await page.screenshot({
        path: resolve(screenshotDir, '08-transport-mode-settings.png'),
        fullPage: true,
      })
      await page.getByTestId('transport-mode-settings-close').click()

    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })

  test('captures gateways and labels', async ({ page, request }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const { userEmail } = await createScreenshotUser(page, suffix)
    const organizationName = await createOrganizationForScreenshots(page, suffix)

    try {
      const workflow = await createWorkflow(page, `Gateway Basis ${suffix}`)
      void workflow
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 20_000 })
      const accessToken = await getAccessToken(page)
      expect(accessToken).toBeTruthy()

      const seedActivityResponse = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/activities/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          parent_id: null,
          node_type: 'activity',
          label: 'Eingang pruefen',
          trigger_type: null,
          position_x: 260,
          position_y: 220,
          status: 'draft',
          status_icon: null,
          activity_type: null,
          description: 'Startet den Entscheidungsfluss.',
          notes: null,
          duration_minutes: null,
          linked_workflow_id: null,
          linked_workflow_mode: null,
          linked_workflow_purpose: null,
          linked_workflow_inputs: [],
          linked_workflow_outputs: [],
        },
      })
      expect(seedActivityResponse.ok()).toBeTruthy()
      const seededActivity = (await seedActivityResponse.json()) as { id: string }
      const seededActivityId = seededActivity.id
      const gatewayResponse = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/activities/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          parent_id: null,
          node_type: 'gateway_decision',
          label: 'Freigabe?',
          trigger_type: null,
          position_x: 560,
          position_y: 220,
          status: 'draft',
          status_icon: null,
          activity_type: null,
          description: 'Verzweigt in alternative Freigabepfade.',
          notes: null,
          duration_minutes: null,
          linked_workflow_id: null,
          linked_workflow_mode: null,
          linked_workflow_purpose: null,
          linked_workflow_inputs: [],
          linked_workflow_outputs: [],
        },
      })
      expect(gatewayResponse.ok()).toBeTruthy()
      const gateway = (await gatewayResponse.json()) as { id: string }

      const yesActivityResponse = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/activities/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          parent_id: null,
          node_type: 'activity',
          label: 'Freigabe erteilen',
          trigger_type: null,
          position_x: 820,
          position_y: 120,
          status: 'draft',
          status_icon: null,
          activity_type: null,
          description: 'Positiver Pfad.',
          notes: null,
          duration_minutes: null,
          linked_workflow_id: null,
          linked_workflow_mode: null,
          linked_workflow_purpose: null,
          linked_workflow_inputs: [],
          linked_workflow_outputs: [],
        },
      })
      expect(yesActivityResponse.ok()).toBeTruthy()
      const yesActivity = (await yesActivityResponse.json()) as { id: string }

      const noActivityResponse = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/activities/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          parent_id: null,
          node_type: 'activity',
          label: 'Freigabe ablehnen',
          trigger_type: null,
          position_x: 820,
          position_y: 320,
          status: 'draft',
          status_icon: null,
          activity_type: null,
          description: 'Negativer Pfad.',
          notes: null,
          duration_minutes: null,
          linked_workflow_id: null,
          linked_workflow_mode: null,
          linked_workflow_purpose: null,
          linked_workflow_inputs: [],
          linked_workflow_outputs: [],
        },
      })
      expect(noActivityResponse.ok()).toBeTruthy()
      const noActivity = (await noActivityResponse.json()) as { id: string }

      const connectSeedResponse = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/canvas-edges/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          parent_activity_id: null,
          from_node_type: 'activity',
          from_node_id: seededActivityId,
          from_handle_id: null,
          to_node_type: 'activity',
          to_node_id: gateway.id,
          to_handle_id: null,
          label: null,
          transport_mode_id: null,
          notes: null,
        },
      })
      if (!connectSeedResponse.ok()) {
        throw new Error(`connectSeedResponse failed: ${connectSeedResponse.status()} ${await connectSeedResponse.text()}`)
      }

      const connectYesResponse = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/canvas-edges/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          parent_activity_id: null,
          from_node_type: 'activity',
          from_node_id: gateway.id,
          from_handle_id: null,
          to_node_type: 'activity',
          to_node_id: yesActivity.id,
          to_handle_id: null,
          label: 'Ja',
          transport_mode_id: null,
          notes: null,
        },
      })
      expect(connectYesResponse.ok()).toBeTruthy()

      const connectNoResponse = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/canvas-edges/upsert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          parent_activity_id: null,
          from_node_type: 'activity',
          from_node_id: gateway.id,
          from_handle_id: null,
          to_node_type: 'activity',
          to_node_id: noActivity.id,
          to_handle_id: null,
          label: 'Nein',
          transport_mode_id: null,
          notes: null,
        },
      })
      expect(connectNoResponse.ok()).toBeTruthy()

      await page.reload()
      await expect(page.getByRole('heading', { name: /Arbeitsablauf ausw/i })).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-open-${workflow.id}`).click()
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 20_000 })

      await expect(page.locator('[data-testid^="gateway-node-"]')).toHaveCount(1, { timeout: 20_000 })
      await expect(page.locator('[data-testid^="edge-label-"]')).toContainText(['Ja', 'Nein'])
      await page.screenshot({
        path: resolve(screenshotDir, '09-gateways-and-labels.png'),
        fullPage: true,
      })
    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })

  test('captures the BIM cyclic coordination reference workflow', async ({ page, request }) => {
    test.setTimeout(60_000)
    const suffix = testSuffix()
    const { userEmail } = await createScreenshotUser(page, suffix)
    const organizationName = await createOrganizationForScreenshots(page, suffix)

    try {
      const workflow = await createWorkflow(page, `BIM Referenz ${suffix}`)
      const accessToken = await getAccessToken(page)
      expect(accessToken).toBeTruthy()

      const createActivity = async (label: string, x: number, y: number, nodeType: 'activity' | 'gateway_decision' = 'activity') => {
        const response = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/activities/upsert`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            parent_id: null,
            node_type: nodeType,
            label,
            trigger_type: null,
            position_x: x,
            position_y: y,
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
          },
        })
        expect(response.ok()).toBeTruthy()
        return (await response.json()) as { id: string }
      }

      const connect = async (
        fromId: string,
        toId: string,
        label?: string,
        fromHandle: string | null = null,
        toHandle: string | null = null,
      ) => {
        const response = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/canvas-edges/upsert`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            parent_activity_id: null,
            from_node_type: 'activity',
            from_node_id: fromId,
            from_handle_id: fromHandle,
            to_node_type: 'activity',
            to_node_id: toId,
            to_handle_id: toHandle,
            label: label ?? null,
            transport_mode_id: null,
            notes: null,
          },
        })
        expect(response.ok()).toBeTruthy()
      }

      const a2 = await createActivity('Lieferanforderung und BCF-Rueckmeldungen bereitstellen', 320, 120)
      const a3 = await createActivity('Fachmodelle disziplinweise bearbeiten', 640, 120)
      const a4 = await createActivity('Modelle intern koordinieren und in AN-CDE konsolidieren', 960, 120)
      const a5 = await createActivity('Synchrone Modelllieferung an AG-CDE durchfuehren', 1280, 120)
      const a6 = await createActivity('Koordinations- und Clash-Detection-Lauf durchfuehren', 1600, 120)
      const a7 = await createActivity('Fachliche Pruefung durchfuehren', 1920, 120)
      const a8 = await createActivity('Pruefergebnisse konsolidieren', 2240, 120)
      const decision = await createActivity('Freigabe?', 2560, 120, 'gateway_decision')
      const approve = await createActivity('Freigabe dokumentieren', 2880, 20)
      const correction = await createActivity('Korrekturen an Auftragnehmer zurueckgeben', 2880, 240)

      const rootActivities = await getActivityNodeIds(page)
      const seededActivityId = rootActivities[0]

      await connect(seededActivityId, a2.id)
      await connect(a2.id, a3.id)
      await connect(a3.id, a4.id)
      await connect(a4.id, a5.id)
      await connect(a5.id, a6.id)
      await connect(a6.id, a7.id)
      await connect(a7.id, a8.id)
      await connect(a8.id, decision.id)
      await connect(decision.id, approve.id, 'Freigegeben')
      await connect(decision.id, correction.id, 'Korrektur erforderlich')
      await connect(correction.id, a3.id, null, 'source-right', 'target-left')

      await page.reload()
      await expect(page.getByRole('heading', { name: /Arbeitsablauf ausw/i })).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-open-${workflow.id}`).click()
      await expect(page.getByTestId(`gateway-node-${decision.id}`)).toBeVisible({ timeout: 20_000 })
      await page.screenshot({
        path: resolve(screenshotDir, '10-bim-cyclic-coordination.png'),
        fullPage: true,
      })
    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })
})



