import { Test } from '@nestjs/testing'
import { fallbackActivityAssignments, fallbackActivityComments, fallbackOrganizationRoles } from '../fallback-store'
import { DatabaseService } from '../database/database.service'
import { ActivitiesService } from './activities.service'

describe('ActivitiesService', () => {
  beforeEach(() => {
    fallbackActivityAssignments.clear()
    fallbackActivityComments.clear()
    fallbackOrganizationRoles.clear()
  })

  it('stores assignment details in the fallback store when the schema is not available yet', async () => {
    fallbackOrganizationRoles.set('role-2', {
      id: 'role-2',
      organization_id: 'org-1',
      label: 'BIM-Koordination',
      description: null,
      sort_order: 1,
      created_at: new Date().toISOString(),
      created_by: 'user-1',
    })
    const roleLookup = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST205',
          message: "Could not find the table 'public.organization_roles' in the schema cache",
        },
      }),
    }
    const upsertWithAssignment = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockRejectedValue(new Error('column "assignee_label" does not exist')),
    }

    const upsertWithoutAssignment = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'activity-1',
          workspace_id: 'workspace-1',
        },
        error: null,
      }),
    }

    const from = jest
      .fn()
      .mockReturnValueOnce(roleLookup)
      .mockReturnValueOnce(upsertWithAssignment)
      .mockReturnValueOnce(upsertWithoutAssignment)

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: DatabaseService,
          useValue: {
            assertWorkspaceAccess: jest.fn().mockResolvedValue({
              id: 'workspace-1',
              organization_id: 'org-1',
            }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(ActivitiesService)
    const activity = await service.upsert('user-1', 'workspace-1', {
      id: 'activity-1',
      parent_id: null,
      node_type: 'activity',
      label: 'Pruefen',
      trigger_type: null,
      position_x: 120,
      position_y: 220,
      status: 'draft',
      status_icon: null,
      activity_type: null,
      description: null,
      notes: null,
      assignee_label: 'Marie Mustermann',
      role_id: 'role-2',
      duration_minutes: null,
    })

    expect(activity).toEqual(
      expect.objectContaining({
        id: 'activity-1',
        activity_type: 'unbestimmt',
        assignee_label: 'Marie Mustermann',
        role_id: 'role-2',
      }),
    )
    expect(fallbackActivityAssignments.get('activity-1')).toEqual({
      activityId: 'activity-1',
      assigneeLabel: 'Marie Mustermann',
      roleId: 'role-2',
    })
  })

  it('supports comment CRUD through the fallback store when the table is not available yet', async () => {
    const listQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockRejectedValue(new Error('relation "activity_comments" does not exist')),
    }
    const insertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockRejectedValue(new Error('relation "activity_comments" does not exist')),
    }
    const updateQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockRejectedValue(new Error('relation "activity_comments" does not exist')),
    }
    const deleteQuery = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn(),
    }
    deleteQuery.eq
      .mockReturnValueOnce(deleteQuery)
      .mockImplementationOnce(() => {
        throw new Error('relation "activity_comments" does not exist')
      })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: DatabaseService,
          useValue: {
            assertWorkspaceAccess: jest.fn().mockResolvedValue({
              id: 'workspace-1',
              organization_id: 'org-1',
            }),
            supabase: {
              from: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    const databaseService = moduleRef.get(DatabaseService)
    ;(databaseService.supabase.from as jest.Mock)
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(listQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(deleteQuery)

    const service = moduleRef.get(ActivitiesService)

    const created = await service.createComment('user-1', 'workspace-1', 'activity-1', 'Ersten Kommentar erfassen')
    expect(created).toEqual(
      expect.objectContaining({
        activity_id: 'activity-1',
        author_user_id: 'user-1',
        body: 'Ersten Kommentar erfassen',
      }),
    )

    const listed = await service.listComments('user-1', 'workspace-1', 'activity-1')
    expect(listed).toHaveLength(1)

    const updated = await service.updateComment(
      'user-1',
      'workspace-1',
      'activity-1',
      created.id,
      'Kommentar aktualisiert',
    )
    expect(updated.body).toBe('Kommentar aktualisiert')

    await expect(
      service.removeComment('user-1', 'workspace-1', 'activity-1', created.id),
    ).resolves.toEqual({ success: true })
    expect(fallbackActivityComments.size).toBe(0)
  })
})
