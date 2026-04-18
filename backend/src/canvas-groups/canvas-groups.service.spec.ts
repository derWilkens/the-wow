import { Test } from '@nestjs/testing'
import { DatabaseService } from '../database/database.service'
import { CanvasGroupsService } from './canvas-groups.service'

describe('CanvasGroupsService', () => {
  it('lists canvas groups within a workspace and normalizes lock and z-index', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn(),
      order: jest.fn(),
    }

    query.order.mockReturnValue(query)
    query.is.mockResolvedValue({
        data: [
          {
            id: 'group-1',
            label: 'Gruppe 1',
            locked: null,
            collapsed: null,
            z_index: null,
          },
        ],
        error: null,
      })

    const moduleRef = await Test.createTestingModule({
      providers: [
        CanvasGroupsService,
        {
          provide: DatabaseService,
          useValue: {
            assertWorkspaceAccess: jest.fn().mockResolvedValue({ id: 'workspace-1' }),
            supabase: {
              from: jest.fn(() => query),
            },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(CanvasGroupsService)
    await expect(service.list('user-1', 'workspace-1', null)).resolves.toEqual([
      expect.objectContaining({
        id: 'group-1',
        label: 'Gruppe 1',
        locked: false,
        collapsed: false,
        z_index: 0,
      }),
    ])
  })

  it('upserts a canvas group for a workspace', async () => {
    const upsertQuery = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'group-1',
          workspace_id: 'workspace-1',
          label: 'Gruppe 1',
          position_x: 120,
          position_y: 80,
          width: 400,
          height: 260,
          locked: false,
          collapsed: true,
          z_index: 2,
        },
        error: null,
      }),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        CanvasGroupsService,
        {
          provide: DatabaseService,
          useValue: {
            assertWorkspaceAccess: jest.fn().mockResolvedValue({ id: 'workspace-1' }),
            supabase: {
              from: jest.fn(() => upsertQuery),
            },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(CanvasGroupsService)
    await expect(
      service.upsert('user-1', 'workspace-1', {
        parent_activity_id: null,
        label: 'Gruppe 1',
        position_x: 120,
        position_y: 80,
        width: 400,
        height: 260,
        collapsed: true,
        z_index: 2,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'group-1',
        workspace_id: 'workspace-1',
        label: 'Gruppe 1',
        collapsed: true,
        z_index: 2,
      }),
    )
  })

  it('removes a canvas group and clears memberships first', async () => {
    const unlinkActivitiesQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    unlinkActivitiesQuery.eq
      .mockReturnValueOnce(unlinkActivitiesQuery)
      .mockResolvedValueOnce({ error: null })

    const unlinkCanvasObjectsQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    unlinkCanvasObjectsQuery.eq
      .mockReturnValueOnce(unlinkCanvasObjectsQuery)
      .mockResolvedValueOnce({ error: null })

    const deleteQuery = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    deleteQuery.eq
      .mockReturnValueOnce(deleteQuery)
      .mockResolvedValueOnce({ error: null })

    const from = jest
      .fn()
      .mockReturnValueOnce(unlinkActivitiesQuery)
      .mockReturnValueOnce(unlinkCanvasObjectsQuery)
      .mockReturnValueOnce(deleteQuery)

    const moduleRef = await Test.createTestingModule({
      providers: [
        CanvasGroupsService,
        {
          provide: DatabaseService,
          useValue: {
            assertWorkspaceAccess: jest.fn().mockResolvedValue({ id: 'workspace-1' }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(CanvasGroupsService)
    await expect(service.remove('user-1', 'workspace-1', 'group-1')).resolves.toEqual({ success: true })
    expect(from).toHaveBeenNthCalledWith(1, 'activities')
    expect(from).toHaveBeenNthCalledWith(2, 'canvas_objects')
    expect(from).toHaveBeenNthCalledWith(3, 'canvas_groups')
  })
})
