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

  test('renders and edits sipoc data for roles, process name, data objects and transport modes', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000)
    const workflowName = `SIPOC Edit ${testSuffix()}`
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
          data: { label: `Supplier ${testSuffix(101)}` },
        }),
        request.post(`http://127.0.0.1:3000/organizations/${organizationId}/roles`, {
          headers: authHeaders,
          data: { label: `Process ${testSuffix(202)}` },
        }),
        request.post(`http://127.0.0.1:3000/organizations/${organizationId}/roles`, {
          headers: authHeaders,
          data: { label: `Consumer ${testSuffix(303)}` },
        }),
        request.post(`http://127.0.0.1:3000/organizations/${organizationId}/roles`, {
          headers: authHeaders,
          data: { label: `Updated ${testSuffix(404)}` },
        }),
      ])

      const [supplierRole, processRole, consumerRole, updatedRole] = await Promise.all(
        roleResponses.map((response) => response.json()),
      )

      const transportModesResponse = await request.get(
        `http://127.0.0.1:3000/organizations/${organizationId}/transport-modes`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      expect(transportModesResponse.ok()).toBeTruthy()
      const transportModes = (await transportModesResponse.json()) as Array<{ id: string; label: string }>
      const [defaultMode] = transportModes
      expect(defaultMode?.id).toBeTruthy()

      const supplierActivity = await (
        await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/activities/upsert`, {
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
        })
      ).json()

      const processActivity = await (
        await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/activities/upsert`, {
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
        })
      ).json()

      const consumerActivity = await (
        await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/activities/upsert`, {
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
        })
      ).json()

      const extraActivity = await (
        await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/activities/upsert`, {
          headers: authHeaders,
          data: {
            parent_id: null,
            node_type: 'activity',
            label: 'Archivieren',
            trigger_type: null,
            position_x: 1160,
            position_y: 320,
            status: 'draft',
            status_icon: null,
            activity_type: 'weiterleiten_ablegen',
            description: 'Liefert wiederverwendbares Datenobjekt',
            notes: null,
            role_id: updatedRole.id,
          },
        })
      ).json()

      const edgeIn = await (
        await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/canvas-edges/upsert`, {
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
            transport_mode_id: defaultMode.id,
            notes: null,
          },
        })
      ).json()

      const edgeOut = await (
        await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/canvas-edges/upsert`, {
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
            transport_mode_id: null,
            notes: null,
          },
        })
      ).json()

      const edgeReusable = await (
        await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/canvas-edges/upsert`, {
          headers: authHeaders,
          data: {
            parent_activity_id: null,
            from_node_type: 'activity',
            from_node_id: consumerActivity.id,
            from_handle_id: 'source-right',
            to_node_type: 'activity',
            to_node_id: extraActivity.id,
            to_handle_id: 'target-left',
            label: null,
            transport_mode_id: defaultMode.id,
            notes: null,
          },
        })
      ).json()

      await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/canvas-objects/upsert`, {
        headers: authHeaders,
        data: {
          parent_activity_id: null,
          object_type: 'datenobjekt',
          name: 'Unterlagenpaket',
          edge_id: edgeIn.id,
          edge_sort_order: 0,
        },
      })

      const reusableObject = await (
        await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/canvas-objects/upsert`, {
          headers: authHeaders,
          data: {
            parent_activity_id: null,
            object_type: 'datenobjekt',
            name: 'Freigabevermerk',
            edge_id: edgeReusable.id,
            edge_sort_order: 0,
          },
        })
      ).json()

      await request.post(`http://127.0.0.1:3000/workspaces/${createdWorkflow.id}/canvas-objects/upsert`, {
        headers: authHeaders,
        data: {
          parent_activity_id: null,
          object_type: 'datenobjekt',
          name: 'Zwischennotiz',
          edge_id: edgeOut.id,
          edge_sort_order: 0,
        },
      })

      await login(page)
      await page.getByTestId(`workspace-open-${createdWorkflow.id}`).click()
      await page.getByTestId('toolbar-view-sipoc').click()

      const processRow = page.getByTestId(`sipoc-row-${processActivity.id}`)
      await expect(processRow).toContainText(`Supplier ${testSuffix(101)}`)
      await expect(processRow).toContainText('Unterlagenpaket')
      await expect(page.getByTestId(`sipoc-process-input-${processActivity.id}`)).toHaveValue('Unterlagen pruefen')
      await expect(processRow).toContainText(`Process ${testSuffix(202)}`)
      await expect(processRow).toContainText(`Consumer ${testSuffix(303)}`)

      const renameResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/workspaces/${createdWorkflow.id}/activities/upsert`) &&
          response.request().method() === 'POST',
      )
      await page.getByTestId(`sipoc-process-input-${processActivity.id}`).fill('Unterlagen final pruefen')
      await page.getByTestId(`sipoc-process-input-${processActivity.id}`).blur()
      await renameResponse

      await page.getByTestId(`sipoc-process-role-${processActivity.id}-trigger`).click()
      await page.getByTestId(`sipoc-process-role-${processActivity.id}-option-${updatedRole.id}`).click()

      await page.getByTestId(`sipoc-supplier-role-${supplierActivity.id}-trigger`).click()
      await page.getByTestId(`sipoc-supplier-role-${supplierActivity.id}-option-${updatedRole.id}`).click()

      await page.getByTestId(`sipoc-input-data-object-${edgeIn.id}-trigger`).click()
      await page.getByTestId(`sipoc-input-data-object-${edgeIn.id}-option-${reusableObject.id}`).click()

      await page.getByTestId(`sipoc-output-data-object-${edgeOut.id}-trigger`).click()
      await page.getByTestId(`sipoc-output-data-object-${edgeOut.id}-create-toggle`).click()
      await page.getByTestId(`sipoc-output-data-object-${edgeOut.id}-create-name`).fill('Pruefbericht')
      await page.getByTestId(`sipoc-output-data-object-${edgeOut.id}-create-submit`).click()

      await page.getByTestId(`sipoc-output-transport-${edgeOut.id}-trigger`).click()
      await page.getByTestId(`sipoc-output-transport-${edgeOut.id}-option-${defaultMode.id}`).click()

      await expect(page.getByTestId(`sipoc-process-input-${processActivity.id}`)).toHaveValue('Unterlagen final pruefen')
      await expect(processRow).toContainText(`Updated ${testSuffix(404)}`)
      await expect(processRow).toContainText('Freigabevermerk')
      await expect(processRow).toContainText('Pruefbericht')
      await expect(processRow).toContainText(defaultMode.label)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})
