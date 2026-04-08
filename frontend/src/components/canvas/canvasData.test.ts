import { describe, expect, it } from 'vitest'
import type { Activity, CanvasEdge, CanvasObject } from '../../types'
import { deriveActivityDataObjects, deriveWorkflowSipocRows, getReusableDataObjectsForEdge } from './canvasData'

const baseActivity = (id: string): Activity => ({
  id,
  workspace_id: 'workspace-1',
  parent_id: null,
  owner_id: 'user-1',
  node_type: 'activity',
  label: id,
  trigger_type: null,
  position_x: 0,
  position_y: 0,
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
  updated_at: new Date().toISOString(),
})

describe('canvasData helpers', () => {
  it('derives incoming and outgoing data objects from connected edges', () => {
    const activity = baseActivity('activity-b')
    const canvasEdges: CanvasEdge[] = [
      {
        id: 'edge-in',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        from_node_type: 'activity',
        from_node_id: 'activity-a',
        from_handle_id: 'source-right',
        to_node_type: 'activity',
        to_node_id: 'activity-b',
        to_handle_id: 'target-left',
        label: null,
        transport_mode_id: null,
        transport_mode: null,
        notes: null,
      },
      {
        id: 'edge-out',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        from_node_type: 'activity',
        from_node_id: 'activity-b',
        from_handle_id: 'source-right',
        to_node_type: 'canvas_object',
        to_node_id: 'store-1',
        to_handle_id: 'target-left',
        label: null,
        transport_mode_id: 'mode-storage',
        transport_mode: {
          id: 'mode-storage',
          organization_id: 'org-1',
          key: 'im_datenspeicher_bereitgestellt',
          label: 'Im Datenspeicher bereitgestellt',
          description: 'Zwischenspeicherung',
          sort_order: 0,
          is_active: true,
          is_default: false,
          created_at: new Date().toISOString(),
          created_by: 'user-1',
        },
        notes: null,
      },
    ]
    const canvasObjects: CanvasObject[] = [
      {
        id: 'data-in',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        object_type: 'datenobjekt',
        name: 'Rechnung',
        edge_id: 'edge-in',
        edge_sort_order: 0,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'data-out',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        object_type: 'datenobjekt',
        name: 'Gepruefte Rechnung',
        edge_id: 'edge-out',
        edge_sort_order: 0,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'store-1',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        object_type: 'quelle',
        name: 'Archiv',
        position_x: 100,
        position_y: 100,
        edge_id: null,
        edge_sort_order: null,
        updated_at: new Date().toISOString(),
      },
    ]

    const result = deriveActivityDataObjects(activity, canvasEdges, canvasObjects)

    expect(result.incoming.map((item) => item.name)).toEqual(['Rechnung'])
    expect(result.outgoing.map((item) => item.name)).toEqual(['Gepruefte Rechnung'])
  })

  it('keeps branched outgoing edges independent', () => {
    const activity = baseActivity('activity-a')
    const canvasEdges: CanvasEdge[] = [
      {
        id: 'edge-1',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        from_node_type: 'activity',
        from_node_id: 'activity-a',
        from_handle_id: 'source-right',
        to_node_type: 'activity',
        to_node_id: 'activity-b',
        to_handle_id: 'target-left',
        label: null,
        transport_mode_id: null,
        transport_mode: null,
        notes: null,
      },
      {
        id: 'edge-2',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        from_node_type: 'activity',
        from_node_id: 'activity-a',
        from_handle_id: 'source-bottom',
        to_node_type: 'activity',
        to_node_id: 'activity-c',
        to_handle_id: 'target-top',
        label: null,
        transport_mode_id: null,
        transport_mode: null,
        notes: null,
      },
    ]
    const canvasObjects: CanvasObject[] = [
      {
        id: 'data-1',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        object_type: 'datenobjekt',
        name: 'Gepruefte Rechnung',
        edge_id: 'edge-1',
        edge_sort_order: 0,
        updated_at: new Date().toISOString(),
      },
    ]

    const result = deriveActivityDataObjects(activity, canvasEdges, canvasObjects)

    expect(result.outgoing).toHaveLength(1)
    expect(result.outgoing[0]?.edge_id).toBe('edge-1')
  })

  it('offers reusable data objects only from other edges', () => {
    const canvasObjects: CanvasObject[] = [
      {
        id: 'edge-1-data',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        object_type: 'datenobjekt',
        name: 'Rechnung',
        edge_id: 'edge-1',
        edge_sort_order: 0,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'edge-2-data',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        object_type: 'datenobjekt',
        name: 'Lieferschein',
        edge_id: 'edge-2',
        edge_sort_order: 0,
        updated_at: new Date().toISOString(),
      },
    ]

    const result = getReusableDataObjectsForEdge(canvasObjects, 'edge-1')

    expect(result.map((item) => item.id)).toEqual(['edge-2-data'])
  })

  it('derives sipoc rows from activity roles, edge data objects and transport modes', () => {
    const activities: Activity[] = [
      {
        ...baseActivity('activity-a'),
        label: 'Unterlagen zusammenstellen',
        position_x: 100,
        position_y: 100,
      },
      {
        ...baseActivity('activity-b'),
        label: 'Unterlagen pruefen',
        position_x: 420,
        position_y: 100,
      },
      {
        ...baseActivity('activity-c'),
        label: 'Unterlagen freigeben',
        position_x: 760,
        position_y: 100,
      },
    ]

    const canvasEdges: CanvasEdge[] = [
      {
        id: 'edge-1',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        from_node_type: 'activity',
        from_node_id: 'activity-a',
        from_handle_id: 'source-right',
        to_node_type: 'activity',
        to_node_id: 'activity-b',
        to_handle_id: 'target-left',
        label: null,
        transport_mode_id: 'mode-mail',
        transport_mode: {
          id: 'mode-mail',
          organization_id: 'org-1',
          key: 'per_mail',
          label: 'Per E-Mail',
          description: null,
          sort_order: 0,
          is_active: true,
          is_default: false,
          created_at: new Date().toISOString(),
          created_by: 'user-1',
        },
        notes: null,
      },
      {
        id: 'edge-2',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        from_node_type: 'activity',
        from_node_id: 'activity-b',
        from_handle_id: 'source-right',
        to_node_type: 'activity',
        to_node_id: 'activity-c',
        to_handle_id: 'target-left',
        label: null,
        transport_mode_id: null,
        transport_mode: null,
        notes: null,
      },
    ]

    const canvasObjects: CanvasObject[] = [
      {
        id: 'data-1',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        object_type: 'datenobjekt',
        name: 'Unterlagenpaket',
        edge_id: 'edge-1',
        edge_sort_order: 0,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'data-2',
        workspace_id: 'workspace-1',
        parent_activity_id: null,
        object_type: 'datenobjekt',
        name: 'Pruefbericht',
        edge_id: 'edge-2',
        edge_sort_order: 0,
        updated_at: new Date().toISOString(),
      },
    ]

    const rows = deriveWorkflowSipocRows(activities, canvasEdges, canvasObjects, {
      'activity-a': 'Fachplanung',
      'activity-b': 'BIM-Koordination',
      'activity-c': 'Projektleitung',
    })

    expect(rows).toHaveLength(3)
    expect(rows[1]).toEqual({
      activityId: 'activity-b',
      processLabel: 'Unterlagen pruefen',
      processRoleLabel: 'BIM-Koordination',
      supplierRoleLabels: ['Fachplanung'],
      consumerRoleLabels: ['Projektleitung'],
      inputs: [
        {
          edgeId: 'edge-1',
          objectName: 'Unterlagenpaket',
          transportModeLabel: 'Per E-Mail',
        },
      ],
      outputs: [
        {
          edgeId: 'edge-2',
          objectName: 'Pruefbericht',
          transportModeLabel: '—',
        },
      ],
    })
  })

  it('uses stable defaults for missing roles and empty io in sipoc rows', () => {
    const rows = deriveWorkflowSipocRows([baseActivity('activity-alone')], [], [], {})

    expect(rows).toEqual([
      {
        activityId: 'activity-alone',
        processLabel: 'activity-alone',
        processRoleLabel: 'Nicht zugeordnet',
        supplierRoleLabels: [],
        consumerRoleLabels: [],
        inputs: [],
        outputs: [],
      },
    ])
  })
})
