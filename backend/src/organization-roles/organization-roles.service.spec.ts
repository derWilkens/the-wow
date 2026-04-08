import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { DatabaseService } from '../database/database.service'
import { OrganizationRolesService } from './organization-roles.service'

describe('OrganizationRolesService', () => {
  it('creates organization roles for admins', async () => {
    const from = jest
      .fn()
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'role-1',
            organization_id: 'org-1',
            label: 'BIM-Koordination',
            description: null,
            sort_order: 1,
            created_by: 'user-1',
          },
          error: null,
        }),
      })

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationRolesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationRole: jest.fn().mockResolvedValue({ id: 'org-1' }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(OrganizationRolesService)
    const result = await service.create('user-1', 'org-1', { label: ' BIM-Koordination ' })

    expect(result).toEqual(expect.objectContaining({ label: 'BIM-Koordination' }))
  })

  it('blocks deleting roles that are still linked to activities', async () => {
    const from = jest
      .fn()
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'role-1', organization_id: 'org-1', label: 'Architektur' },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 2,
          error: null,
        }),
      })

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationRolesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationRole: jest.fn().mockResolvedValue({ id: 'org-1' }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(OrganizationRolesService)

    await expect(service.remove('user-1', 'org-1', 'role-1')).rejects.toBeInstanceOf(BadRequestException)
  })
})
