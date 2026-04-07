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
})
