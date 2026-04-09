import { Test } from '@nestjs/testing'
import { DatabaseService } from '../database/database.service'
import { WorkspacesService } from './workspaces.service'

describe('WorkspacesService', () => {
  it('lists workspaces for the current user', async () => {
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
    }

    query.select = jest.fn().mockReturnValue(query)
    query.eq = jest.fn().mockReturnValue(query)
    query.order = jest
      .fn()
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: [{ id: 'ws-1' }], error: null })

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationAccess: jest.fn(),
            supabase: { from: jest.fn(() => query) },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(WorkspacesService)
    await expect(service.list('user-1', 'org-1')).resolves.toEqual([{ id: 'ws-1' }])
  })

  it('updates workspace metadata for the current user', async () => {
    const query = {
      update: jest.fn(),
      eq: jest.fn(),
      select: jest.fn(),
      single: jest.fn(),
    }

    query.update = jest.fn().mockReturnValue(query)
    query.eq = jest.fn().mockReturnValue(query)
    query.select = jest.fn().mockReturnValue(query)
    query.single = jest.fn().mockResolvedValue({
      data: {
        id: 'ws-1',
        name: 'Neuer Ablaufname',
        purpose: 'Klaert den Zweck',
        expected_inputs: ['Anfrage'],
        expected_outputs: ['Freigabe'],
      },
      error: null,
    })

    const databaseService = {
      assertWorkspaceAccess: jest.fn(),
      supabase: { from: jest.fn(() => query) },
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: DatabaseService,
          useValue: databaseService,
        },
      ],
    }).compile()

    const service = moduleRef.get(WorkspacesService)

    await expect(
      service.update('user-1', 'ws-1', {
        name: '  Neuer Ablaufname  ',
        purpose: ' Klaert den Zweck ',
        expected_inputs: ['Anfrage'],
        expected_outputs: ['Freigabe'],
      }),
    ).resolves.toMatchObject({
      id: 'ws-1',
      name: 'Neuer Ablaufname',
    })

    expect(databaseService.assertWorkspaceAccess).toHaveBeenCalledWith('ws-1', 'user-1')
    expect(query.update).toHaveBeenCalledWith({
      name: 'Neuer Ablaufname',
      purpose: 'Klaert den Zweck',
      expected_inputs: ['Anfrage'],
      expected_outputs: ['Freigabe'],
    })
  })
})
