import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { DatabaseService } from '../database/database.service'
import { OrganizationRolesService } from './organization-roles.service'

describe('OrganizationRolesService', () => {
  it('creates organization roles for admins', async () => {
    let mode: 'existing' | 'sort' | 'insert' = 'existing'
    const query: any = {
      select: jest.fn((columns?: string) => {
        mode = columns === 'sort_order' ? 'sort' : mode
        return query
      }),
      eq: jest.fn(() => query),
      ilike: jest.fn(() => query),
      order: jest.fn(() => query),
      limit: jest.fn(() => query),
      maybeSingle: jest.fn(async () => {
        if (mode === 'sort') {
          return { data: { sort_order: 0 }, error: null }
        }
        return { data: null, error: null }
      }),
      insert: jest.fn(() => {
        mode = 'insert'
        return query
      }),
      single: jest.fn(async () => ({
        data: {
          id: 'role-1',
          organization_id: 'org-1',
          label: 'BIM-Koordination',
          acronym: 'BK',
          description: null,
          sort_order: 1,
          created_by: 'user-1',
        },
        error: null,
      })),
    }

    const from = jest.fn((table: string) => {
      if (table !== 'organization_roles') {
        throw new Error(`unexpected table ${table}`)
      }
      mode = 'existing'
      return query
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

    expect(result).toEqual(expect.objectContaining({ label: 'BIM-Koordination', acronym: 'BK' }))
  })

  it('keeps a manually provided acronym on create', async () => {
    let mode: 'existing' | 'sort' | 'insert' = 'existing'
    const query: any = {
      select: jest.fn((columns?: string) => {
        mode = columns === 'sort_order' ? 'sort' : mode
        return query
      }),
      eq: jest.fn(() => query),
      ilike: jest.fn(() => query),
      order: jest.fn(() => query),
      limit: jest.fn(() => query),
      maybeSingle: jest.fn(async () => {
        if (mode === 'sort') {
          return { data: { sort_order: 1 }, error: null }
        }
        return { data: null, error: null }
      }),
      insert: jest.fn(() => {
        mode = 'insert'
        return query
      }),
      single: jest.fn(async () => ({
        data: {
          id: 'role-2',
          organization_id: 'org-1',
          label: 'Projekt-Leitung',
          acronym: 'PL',
          description: null,
          sort_order: 2,
          created_by: 'user-1',
        },
        error: null,
      })),
    }

    const from = jest.fn((table: string) => {
      if (table !== 'organization_roles') {
        throw new Error(`unexpected table ${table}`)
      }
      mode = 'existing'
      return query
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
    const result = await service.create('user-1', 'org-1', { label: 'Projekt-Leitung', acronym: 'pl' })

    expect(result).toEqual(expect.objectContaining({ acronym: 'PL' }))
  })

  it('updates and regenerates the acronym when it is cleared', async () => {
    const from = jest
      .fn()
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'role-1', organization_id: 'org-1', label: 'Projekt-Leitung', acronym: 'PL', description: null },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'role-1',
            organization_id: 'org-1',
            label: 'BIM-Koordination',
            acronym: 'BK',
            description: null,
            sort_order: 1,
            created_at: new Date().toISOString(),
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
    const result = await service.update('user-1', 'org-1', 'role-1', { label: 'BIM-Koordination', acronym: '' })

    expect(result).toEqual(expect.objectContaining({ label: 'BIM-Koordination', acronym: 'BK' }))
  })

  it('blocks deleting roles that are still linked to activities', async () => {
    const from = jest
      .fn()
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'role-1', organization_id: 'org-1', label: 'Architektur', acronym: 'A' },
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
