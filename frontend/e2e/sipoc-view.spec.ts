import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getActiveOrganizationId,
  login,
  requireCredentials,
  testSuffix,
} from './helpers'

test.describe('sipoc view', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('renders a read-only sipoc table derived from workflow roles, data objects and transport modes', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000)
    const workflowName = `SIPOC View ${testSuffix()}`
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const organizationId = await getActiveOrganizationId(page)
      expect(accessToken).toBeTruthy()
      expect(organizationId).toBeTruthy()

      const createdWorkflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(createdWorkflow.id)

      const authHeaders = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }

      const roleResponses = await Promise.all([
        request.post(`http://127.0.0.1:3000/organizations/${organizationId}/roles`, {
          headers: authHeaders,
          data: { label: `Fachplanung ${testSuffix(101)}` },
        }),
        request.post(`http://127.0.0.1:3000/organizations/${organizationId}/roles`, {
          headers: authHeaders,
          data: { label: `BIM-Koordination ${testSuffix(202)}` },
        }),
        request.post(`http://127.0.0.1:3000/organizations/${organizationId}/roles`, {
          headers: authHeaders,
          data: { label: `Projektleitung ${testSuffix(303)}` },
        }),
      ])

      const [supplierRole, processRole, consumerRole] = await Promise.all(roleResponses.map((response) => response.json()))

      const transportModesResponse = await request.get(
        `http://127.0.0.1:3000/organizations/${organizationId}/transport-modes`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      expect(transportModesResponse.ok()).toBeTruthy()
      const transportModes = (await transportModesResponse.json()) as Array<{ id: string; label: string }>
      const [inputMode, outputMode] = transportModes
      expect(inputMode?.id).toBeTruthy()
      expect(outputMode?.id).toBeTruthy()

      const supplierActivityResponse = await request.post(
        `http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/activities/upsert`,
        {
          headers: authHeaders,
          data: {
            parent_id: null,
            node_type: 'activity',
            label: 'Unterlagen zusammenstellen',
            trigger_type: null,
            position_x: 180,
            position_y: 160,
            status: 'draft',
            status_icon: null,
            activity_type: 'erstellen',
            description: 'Vorbereitende Aktivitaet',
            notes: null,
            role_id: supplierRole.id,
          },
        },
      )
      expect(supplierActivityResponse.ok()).toBeTruthy()
      const supplierActivity = await supplierActivityResponse.json()

      const processActivityResponse = await request.post(
        `http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/activities/upsert`,
        {
          headers: authHeaders,
          data: {
            parent_id: null,
            node_type: 'activity',
            label: 'Unterlagen pruefen',
            trigger_type: null,
            position_x: 520,
            position_y: 160,
            status: 'draft',
            status_icon: null,
            activity_type: 'pruefen_freigeben',
            description: 'SIPOC-Pruefaktivitaet',
            notes: null,
            role_id: processRole.id,
          },
        },
      )
      const processActivity = await processActivityResponse.json()

      const consumerActivityResponse = await request.post(
        `http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/activities/upsert`,
        {
          headers: authHeaders,
          data: {
            parent_id: null,
            node_type: 'activity',
            label: 'Unterlagen freigeben',
            trigger_type: null,
            position_x: 860,
            position_y: 160,
            status: 'draft',
            status_icon: null,
            activity_type: 'weiterleiten_ablegen',
            description: 'SIPOC-Freigabeaktivitaet',
            notes: null,
            role_id: consumerRole.id,
          },
        },
      )
      const consumerActivity = await consumerActivityResponse.json()

      const edgeInResponse = await request.post(
        `http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/canvas-edges/upsert`,
        {
          headers: authHeaders,
          data: {
            parent_activity_id: null,
            from_node_type: 'activity',
            from_node_id: supplierActivity.id,
            from_handle_id: 'source-right',
            to_node_type: 'activity',
            to_node_id: processActivity.id,
            to_handle_id: 'target-left',
            label: null,
            transport_mode_id: inputMode.id,
            notes: null,
          },
        },
      )
      expect(edgeInResponse.ok()).toBeTruthy()
      const edgeIn = await edgeInResponse.json()

      const edgeOutResponse = await request.post(
        `http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/canvas-edges/upsert`,
        {
          headers: authHeaders,
          data: {
            parent_activity_id: null,
            from_node_type: 'activity',
            from_node_id: processActivity.id,
            from_handle_id: 'source-right',
            to_node_type: 'activity',
            to_node_id: consumerActivity.id,
            to_handle_id: 'target-left',
            label: null,
            transport_mode_id: outputMode.id,
            notes: null,
          },
        },
      )
      expect(edgeOutResponse.ok()).toBeTruthy()
      const edgeOut = await edgeOutResponse.json()

      const inputObjectResponse = await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/canvas-objects/upsert`, {
        headers: authHeaders,
        data: {
          parent_activity_id: null,
          object_type: 'datenobjekt',
          name: 'Unterlagenpaket',
          edge_id: edgeIn.id,
          edge_sort_order: 0,
        },
      })
      expect(inputObjectResponse.ok()).toBeTruthy()

      const outputObjectResponse = await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/canvas-objects/upsert`, {
        headers: authHeaders,
        data: {
          parent_activity_id: null,
          object_type: 'datenobjekt',
          name: 'Pruefbericht',
          edge_id: edgeOut.id,
          edge_sort_order: 0,
        },
      })
      expect(outputObjectResponse.ok()).toBeTruthy()

      await login(page)
      const workspaceOpenButton = page.getByTestId(`workspace-open-${createdWorkflow.id}`)
      await expect(workspaceOpenButton).toBeVisible({ timeout: 10_000 })
      await workspaceOpenButton.click()
      await expect(page.getByTestId('toolbar-view-sipoc')).toBeVisible()
      await page.getByTestId('toolbar-view-sipoc').click()

      await expect(page.getByTestId('workflow-sipoc-table')).toBeVisible()
      await expect(page.getByTestId(`sipoc-row-${processActivity.id}`)).toBeVisible()

      const processRow = page.getByTestId(`sipoc-row-${processActivity.id}`)
      await expect(processRow).toContainText(`Fachplanung ${testSuffix(101)}`)
      await expect(processRow).toContainText('Unterlagenpaket')
      await expect(processRow).toContainText(inputMode.label)
      await expect(processRow).toContainText('Unterlagen pruefen')
      await expect(processRow).toContainText(`BIM-Koordination ${testSuffix(202)}`)
      await expect(processRow).toContainText('Pruefbericht')
      await expect(processRow).toContainText(outputMode.label)
      await expect(processRow).toContainText(`Projektleitung ${testSuffix(303)}`)

      await page.getByTestId('toolbar-view-canvas').click()
      await expect(page.getByTestId('workflow-canvas')).toBeVisible()
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
