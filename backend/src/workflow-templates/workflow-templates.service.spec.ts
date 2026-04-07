import { Test } from '@nestjs/testing'
import { fallbackWorkflowTemplates } from '../fallback-store'
import { DatabaseService } from '../database/database.service'
import { WorkflowTemplatesService } from './workflow-templates.service'

describe('WorkflowTemplatesService', () => {
  beforeEach(() => {
    fallbackWorkflowTemplates.clear()
  })

  it('seeds and lists default templates through the fallback store when the schema is unavailable', async () => {
    const failingQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      insert: jest.fn().mockRejectedValue(new Error('relation "workflow_templates" does not exist')),
    }
    failingQuery.eq
      .mockResolvedValueOnce({
        data: null,
        error: new Error('relation "workflow_templates" does not exist'),
      })
      .mockReturnValue(failingQuery)
    failingQuery.order
      .mockReturnValueOnce(failingQuery)
      .mockRejectedValueOnce(new Error('column "snapshot" does not exist'))

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkflowTemplatesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationAccess: jest.fn().mockResolvedValue({ id: 'org-1' }),
            supabase: {
              from: jest.fn(() => failingQuery),
            },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(WorkflowTemplatesService)
    await service.seedDefaultsForOrganization('org-1', 'user-1')

    const templates = await service.list('user-1', 'org-1')
    expect(templates.length).toBeGreaterThan(0)
    expect(templates.every((template) => template.organization_id === 'org-1')).toBe(true)
    expect(templates.some((template) => template.is_system)).toBe(true)
  })

  it('stores a custom template in the fallback store when the table is not available yet', async () => {
    const failingTemplateInsert = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockRejectedValue(new Error('relation "workflow_templates" does not exist')),
    }

    const rootWorkspaceQuery = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'workspace-1',
            name: 'Rechnungseingang',
            purpose: 'Rechnungen aufnehmen',
            expected_inputs: [],
            expected_outputs: [],
          },
        ],
        error: null,
      }),
    }

    const descendantWorkspaceQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    const activitiesQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    const edgesQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    const objectsQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    const from = jest
      .fn()
      .mockImplementationOnce(() => rootWorkspaceQuery)
      .mockImplementationOnce(() => descendantWorkspaceQuery)
      .mockImplementationOnce(() => activitiesQuery)
      .mockImplementationOnce(() => edgesQuery)
      .mockImplementationOnce(() => objectsQuery)
      .mockImplementationOnce(() => failingTemplateInsert)

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkflowTemplatesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationAccess: jest.fn().mockResolvedValue({ id: 'org-1' }),
            assertWorkspaceAccess: jest.fn().mockResolvedValue({
              id: 'workspace-1',
              organization_id: 'org-1',
            }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(WorkflowTemplatesService)
    const created = await service.create('user-1', {
      organization_id: 'org-1',
      source_workspace_id: 'workspace-1',
      name: 'Rechnungseingang Vorlage',
      description: 'Typischer Ablauf',
    })

    expect(created).toEqual(
      expect.objectContaining({
        organization_id: 'org-1',
        name: 'Rechnungseingang Vorlage',
        description: 'Typischer Ablauf',
      }),
    )
    expect(fallbackWorkflowTemplates.get(created.id)).toBeDefined()
  })

  it('instantiates snapshots with remapped activity and canvas object edges in the correct order', async () => {
    const insertedRows = {
      workspaces: [] as Array<Record<string, unknown>>,
      activities: [] as Array<Record<string, unknown>>,
      edges: [] as Array<Record<string, unknown>>,
      canvasObjects: [] as Array<Record<string, unknown>>,
      objectFields: [] as Array<Record<string, unknown>>,
    }

    const templateRecord = {
      id: 'template-1',
      organization_id: 'org-1',
      is_system: false,
      snapshot: {
        rootWorkspace: {
          name: 'Vorlage Quelle',
          purpose: null,
          expected_inputs: [],
          expected_outputs: [],
        },
        workspaces: [],
        activities: [
          {
            tempId: 'activity-a',
            workspaceTempId: 'root',
            parentTempId: null,
            linkedWorkflowTempId: null,
            node_type: 'task',
            label: 'A',
            trigger_type: null,
            position_x: 100,
            position_y: 100,
            status: 'draft',
            status_icon: null,
            activity_type: null,
            description: null,
            notes: null,
            duration_minutes: null,
            linked_workflow_mode: null,
            linked_workflow_purpose: null,
            linked_workflow_inputs: [],
            linked_workflow_outputs: [],
          },
        ],
        edges: [
          {
            tempId: 'edge-1',
            workspaceTempId: 'root',
            parentActivityTempId: null,
            from_node_type: 'activity',
            from_node_temp_id: 'activity-a',
            from_handle_id: 'activity-right',
            to_node_type: 'quelle',
            to_node_temp_id: 'storage-1',
            to_handle_id: 'source-left',
            label: 'uebergibt',
            transport_mode_id: null,
            notes: null,
          },
        ],
        canvasObjects: [
          {
            tempId: 'storage-1',
            workspaceTempId: 'root',
            parentActivityTempId: null,
            object_type: 'quelle',
            name: 'Ablage',
            edgeTempId: null,
            edge_sort_order: null,
            position_x: 320,
            position_y: 120,
            fields: [],
          },
          {
            tempId: 'data-1',
            workspaceTempId: 'root',
            parentActivityTempId: null,
            object_type: 'datenobjekt',
            name: 'Rechnung',
            edgeTempId: 'edge-1',
            edge_sort_order: 0,
            position_x: null,
            position_y: null,
            fields: [
              { name: 'nummer', field_type: 'text', required: true, sort_order: 0 },
            ],
          },
        ],
      },
    }

    const queryBuilders = {
      templateSelect: {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: templateRecord, error: null }),
      },
      insertWorkspaces: {
        insert: jest.fn().mockImplementation((rows) => {
          insertedRows.workspaces = rows
          return Promise.resolve({ error: null })
        }),
      },
      insertActivities: {
        insert: jest.fn().mockImplementation((rows) => {
          insertedRows.activities = rows
          return Promise.resolve({ error: null })
        }),
      },
      insertEdges: {
        insert: jest.fn().mockImplementation((rows) => {
          insertedRows.edges = rows
          return Promise.resolve({ error: null })
        }),
      },
      selectWorkspaceById: {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() =>
          Promise.resolve({
            data: {
              id: insertedRows.workspaces[0]?.id,
              name: insertedRows.workspaces[0]?.name,
            },
            error: null,
          }),
        ),
      },
    }

    const from = jest.fn((table: string) => {
      if (table === 'workflow_templates') {
        return queryBuilders.templateSelect
      }
      if (table === 'workspaces') {
        if (queryBuilders.insertWorkspaces.insert.mock.calls.length === 0) {
          return queryBuilders.insertWorkspaces
        }
        return queryBuilders.selectWorkspaceById
      }
      if (table === 'activities') {
        return queryBuilders.insertActivities
      }
      if (table === 'canvas_edges') {
        return queryBuilders.insertEdges
      }
      if (table === 'canvas_objects') {
        return {
          insert: jest.fn().mockImplementation((row: Record<string, unknown>) => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
              insertedRows.canvasObjects.push(row)
              return Promise.resolve({ data: row, error: null })
            }),
          })),
        }
      }
      if (table === 'object_fields') {
        return {
          insert: jest.fn().mockImplementation((rows: Array<Record<string, unknown>>) => {
            insertedRows.objectFields.push(...rows)
            return Promise.resolve({ error: null })
          }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkflowTemplatesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationAccess: jest.fn().mockResolvedValue({ id: 'org-1' }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(WorkflowTemplatesService)
    await service.instantiate('user-1', 'template-1', {
      organization_id: 'org-1',
      name: 'Vorlage Instanz',
    })

    expect(insertedRows.workspaces).toHaveLength(1)
    expect(insertedRows.activities).toHaveLength(1)
    expect(insertedRows.edges).toHaveLength(1)
    expect(insertedRows.canvasObjects).toHaveLength(2)

    const insertedActivity = insertedRows.activities[0]
    const insertedStorage = insertedRows.canvasObjects.find((entry) => entry.object_type === 'quelle')
    const insertedEdge = insertedRows.edges[0]
    const insertedDataObject = insertedRows.canvasObjects.find((entry) => entry.object_type === 'datenobjekt')

    expect(insertedStorage).toBeDefined()
    expect(insertedDataObject).toBeDefined()
    expect(insertedRows.canvasObjects[0].object_type).toBe('quelle')
    expect(insertedRows.canvasObjects[1].object_type).toBe('datenobjekt')
    expect(insertedEdge.from_node_id).toBe(insertedActivity.id)
    expect(insertedEdge.to_node_id).toBe(insertedStorage!.id)
    expect(insertedDataObject!.edge_id).toBe(insertedEdge.id)
    expect(insertedRows.objectFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          object_id: insertedDataObject!.id,
          name: 'nummer',
          field_type: 'text',
          required: true,
        }),
      ]),
    )
  })

  it('instantiates legacy shipped template snapshots that still use from/to edge references', async () => {
    const insertedRows = {
      workspaces: [] as Array<Record<string, unknown>>,
      activities: [] as Array<Record<string, unknown>>,
      edges: [] as Array<Record<string, unknown>>,
      canvasObjects: [] as Array<Record<string, unknown>>,
    }

    const templateRecord = {
      id: 'template-legacy',
      organization_id: 'org-1',
      is_system: true,
      snapshot: {
        rootWorkspace: {
          name: 'Freigabeprozess',
          purpose: 'Dokument pruefen',
          expected_inputs: ['Antrag'],
          expected_outputs: ['Freigabe'],
        },
        workspaces: [],
        activities: [
          { tempId: 'start', parentTempId: null, node_type: 'start_event', label: 'Start', position_x: 60, position_y: 220 },
          { tempId: 'task', parentTempId: null, node_type: 'activity', label: 'Pruefen', position_x: 250, position_y: 190 },
          { tempId: 'end', parentTempId: null, node_type: 'end_event', label: 'Ende', position_x: 520, position_y: 220 },
        ],
        edges: [
          { tempId: 'e1', from: 'start', to: 'task' },
          { tempId: 'e2', from: 'task', to: 'end' },
        ],
        canvasObjects: [],
      },
    }

    const queryBuilders = {
      templateSelect: {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: templateRecord, error: null }),
      },
      insertWorkspaces: {
        insert: jest.fn().mockImplementation((rows) => {
          insertedRows.workspaces = rows
          return Promise.resolve({ error: null })
        }),
      },
      insertActivities: {
        insert: jest.fn().mockImplementation((rows) => {
          insertedRows.activities = rows
          return Promise.resolve({ error: null })
        }),
      },
      insertEdges: {
        insert: jest.fn().mockImplementation((rows) => {
          insertedRows.edges = rows
          return Promise.resolve({ error: null })
        }),
      },
      selectWorkspaceById: {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() =>
          Promise.resolve({
            data: {
              id: insertedRows.workspaces[0]?.id,
              name: insertedRows.workspaces[0]?.name,
            },
            error: null,
          }),
        ),
      },
    }

    const from = jest.fn((table: string) => {
      if (table === 'workflow_templates') return queryBuilders.templateSelect
      if (table === 'workspaces') {
        if (queryBuilders.insertWorkspaces.insert.mock.calls.length === 0) {
          return queryBuilders.insertWorkspaces
        }
        return queryBuilders.selectWorkspaceById
      }
      if (table === 'activities') return queryBuilders.insertActivities
      if (table === 'canvas_edges') return queryBuilders.insertEdges
      if (table === 'canvas_objects') {
        return {
          insert: jest.fn().mockImplementation((row: Record<string, unknown>) => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: row, error: null }),
          })),
        }
      }
      if (table === 'object_fields') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkflowTemplatesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationAccess: jest.fn().mockResolvedValue({ id: 'org-1' }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(WorkflowTemplatesService)
    await service.instantiate('user-1', 'template-legacy', {
      organization_id: 'org-1',
      name: 'Legacy Instanz',
    })

    expect(insertedRows.activities).toHaveLength(3)
    expect(insertedRows.edges).toHaveLength(2)
    expect(insertedRows.edges[0]).toEqual(
      expect.objectContaining({
        from_node_type: 'activity',
        to_node_type: 'activity',
      }),
    )
    expect(insertedRows.edges[0].from_node_id).toBe(insertedRows.activities[0].id)
    expect(insertedRows.edges[0].to_node_id).toBe(insertedRows.activities[1].id)
    expect(insertedRows.edges[1].from_node_id).toBe(insertedRows.activities[1].id)
    expect(insertedRows.edges[1].to_node_id).toBe(insertedRows.activities[2].id)
  })
})
