import { Test } from '@nestjs/testing'
import { DatabaseService } from '../database/database.service'
import { CanvasObjectsService } from './canvas-objects.service'

describe('CanvasObjectsService', () => {
  it('falls back to listing without z-index order when the schema is missing', async () => {
    const queryWithZIndex = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: '42703',
          message: 'column canvas_objects.z_index does not exist',
        },
      }),
    }

    const queryWithoutZIndex = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'source-high',
            object_type: 'quelle',
            name: 'Quelle B',
            position_x: 300,
            is_locked: null,
          },
          {
            id: 'source-low',
            object_type: 'quelle',
            name: 'Quelle A',
            position_x: 120,
            is_locked: null,
          },
        ],
        error: null,
      }),
    }

    const fieldsQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    const from = jest
      .fn()
      .mockReturnValueOnce(queryWithZIndex)
      .mockReturnValueOnce(queryWithoutZIndex)
      .mockReturnValueOnce(fieldsQuery)

    const moduleRef = await Test.createTestingModule({
      providers: [
        CanvasObjectsService,
        {
          provide: DatabaseService,
          useValue: {
            assertWorkspaceAccess: jest.fn().mockResolvedValue({ id: 'workspace-1' }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(CanvasObjectsService)
    await expect(service.list('user-1', 'workspace-1', null)).resolves.toEqual([
      expect.objectContaining({
        id: 'source-low',
        z_index: 0,
        is_locked: false,
      }),
      expect.objectContaining({
        id: 'source-high',
        z_index: 0,
        is_locked: false,
      }),
    ])
  })

  it('falls back to upserting without z-index when the schema is missing', async () => {
    const upsertWithZIndex = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST204',
          message: "Could not find the 'z_index' column of 'canvas_objects' in the schema cache",
        },
      }),
    }

    const upsertWithoutZIndex = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'source-1',
          workspace_id: 'workspace-1',
          object_type: 'quelle',
          name: 'Quelle A',
          position_x: 420,
          position_y: 240,
          is_locked: false,
        },
        error: null,
      }),
    }

    const createListQuery = () => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'source-1',
            workspace_id: 'workspace-1',
            object_type: 'quelle',
            name: 'Quelle A',
            position_x: 420,
            position_y: 240,
            is_locked: false,
          },
        ],
        error: null,
      }),
    })

    const createFieldsQuery = () => ({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    const from = jest
      .fn()
      .mockReturnValueOnce(upsertWithZIndex)
      .mockReturnValueOnce(upsertWithoutZIndex)
      .mockReturnValueOnce(createListQuery())
      .mockReturnValueOnce(createFieldsQuery())
      .mockReturnValueOnce(createListQuery())
      .mockReturnValueOnce(createFieldsQuery())

    const moduleRef = await Test.createTestingModule({
      providers: [
        CanvasObjectsService,
        {
          provide: DatabaseService,
          useValue: {
            assertWorkspaceAccess: jest.fn().mockResolvedValue({ id: 'workspace-1' }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(CanvasObjectsService)
    await expect(
      service.upsert('user-1', 'workspace-1', {
        parent_activity_id: null,
        object_type: 'quelle',
        name: 'Quelle A',
        position_x: 420,
        position_y: 240,
        z_index: 7,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'source-1',
        z_index: 7,
      }),
    )

    expect(upsertWithoutZIndex.upsert).toHaveBeenCalledWith(
      expect.not.objectContaining({
        z_index: expect.anything(),
      }),
    )
  })
})
