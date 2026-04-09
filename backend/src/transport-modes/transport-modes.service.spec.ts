import { Test } from '@nestjs/testing'
import { DatabaseService } from '../database/database.service'
import { TransportModesService } from './transport-modes.service'

describe('TransportModesService', () => {
  it('lists transport modes within an organization', async () => {
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
    }

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({
        data: [{ id: 'mode-1', label: 'Direkt' }],
        error: null,
      })

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransportModesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationAccess: jest.fn(),
            supabase: {
              from: jest.fn(() => query),
            },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(TransportModesService)
    await expect(service.list('user-1', 'org-1')).resolves.toEqual([{ id: 'mode-1', label: 'Direkt' }])
  })

  it('creates a normalized transport mode for admins', async () => {
    const sortQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn(),
    }
    sortQuery.select.mockReturnValue(sortQuery)
    sortQuery.eq.mockReturnValue(sortQuery)
    sortQuery.order.mockReturnValue(sortQuery)
    sortQuery.limit.mockReturnValue(sortQuery)
    sortQuery.maybeSingle.mockResolvedValue({
      data: { sort_order: 3 },
      error: null,
    })

    const insertQuery = {
      insert: jest.fn(),
      select: jest.fn(),
      single: jest.fn(),
    }
    insertQuery.insert.mockReturnValue(insertQuery)
    insertQuery.select.mockReturnValue(insertQuery)
    insertQuery.single.mockResolvedValue({
      data: {
        id: 'mode-1',
        organization_id: 'org-1',
        key: 'teams_nachricht',
        label: 'Teams Nachricht',
      },
      error: null,
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransportModesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationRole: jest.fn(),
            supabase: {
              from: jest.fn().mockReturnValueOnce(sortQuery).mockReturnValueOnce(insertQuery),
            },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(TransportModesService)
    await expect(
      service.create('user-1', 'org-1', {
        label: ' Teams Nachricht ',
        description: 'Hinweis ueber Teams',
        is_default: false,
      }),
    ).resolves.toMatchObject({
      id: 'mode-1',
      key: 'teams_nachricht',
      label: 'Teams Nachricht',
    })
  })
})
