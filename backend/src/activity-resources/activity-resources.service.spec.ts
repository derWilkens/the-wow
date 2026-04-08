import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ActivityResourcesService } from './activity-resources.service'

describe('ActivityResourcesService', () => {
  it('returns an existing IT tool instead of creating a duplicate', async () => {
    const existingTool = {
      id: 'tool-1',
      organization_id: 'org-1',
      name: 'SAP',
      description: 'ERP',
      created_at: new Date().toISOString(),
      created_by: 'user-1',
    }

    const itToolsQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      ilike: jest.fn(),
      maybeSingle: jest.fn(),
    }

    itToolsQuery.select.mockReturnValue(itToolsQuery)
    itToolsQuery.eq.mockReturnValue(itToolsQuery)
    itToolsQuery.ilike.mockReturnValue(itToolsQuery)
    itToolsQuery.maybeSingle.mockResolvedValue({ data: existingTool, error: null })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityResourcesService,
        {
          provide: DatabaseService,
          useValue: {
            assertWorkspaceAccess: jest.fn().mockResolvedValue({ id: 'workspace-1', organization_id: 'org-1' }),
            supabase: {
              from: jest.fn((table: string) => {
                if (table === 'it_tools') {
                  return itToolsQuery
                }
                throw new Error(`Unexpected table: ${table}`)
              }),
            },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(ActivityResourcesService)

    await expect(
      service.createTool('user-1', 'workspace-1', {
        name: ' SAP ',
        description: 'Neues ERP',
      }),
    ).resolves.toEqual(existingTool)
  })

  it('links an existing IT tool to an activity', async () => {
    const tool = {
      id: 'tool-1',
      organization_id: 'org-1',
      name: 'Outlook',
      description: 'Mail',
      created_at: new Date().toISOString(),
      created_by: 'user-1',
    }

    const activitiesQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn(),
    }
    activitiesQuery.select.mockReturnValue(activitiesQuery)
    activitiesQuery.eq.mockReturnValue(activitiesQuery)
    activitiesQuery.maybeSingle.mockResolvedValue({ data: { id: 'activity-1' }, error: null })

    const itToolsQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn(),
    }
    itToolsQuery.select.mockReturnValue(itToolsQuery)
    itToolsQuery.eq.mockReturnValue(itToolsQuery)
    itToolsQuery.maybeSingle.mockResolvedValue({ data: tool, error: null })

    const activityItToolsQuery = {
      upsert: jest.fn(),
    }
    activityItToolsQuery.upsert.mockResolvedValue({ error: null })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityResourcesService,
        {
          provide: DatabaseService,
          useValue: {
            assertWorkspaceAccess: jest.fn().mockResolvedValue({ id: 'workspace-1', organization_id: 'org-1' }),
            supabase: {
              from: jest.fn((table: string) => {
                if (table === 'activities') {
                  return activitiesQuery
                }
                if (table === 'it_tools') {
                  return itToolsQuery
                }
                if (table === 'activity_it_tools') {
                  return activityItToolsQuery
                }
                throw new Error(`Unexpected table: ${table}`)
              }),
            },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(ActivityResourcesService)

    await expect(service.linkTool('user-1', 'workspace-1', 'activity-1', 'tool-1')).resolves.toEqual(tool)
    expect(activityItToolsQuery.upsert).toHaveBeenCalledWith({
      activity_id: 'activity-1',
      tool_id: 'tool-1',
    })
  })

  it('updates an organization IT tool', async () => {
    const tool = {
      id: 'tool-1',
      organization_id: 'org-1',
      name: 'SAP',
      description: 'ERP',
      created_at: new Date().toISOString(),
      created_by: 'user-1',
    }

    const itToolsLookupQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn(),
    }
    itToolsLookupQuery.select.mockReturnValue(itToolsLookupQuery)
    itToolsLookupQuery.eq.mockReturnValue(itToolsLookupQuery)
    itToolsLookupQuery.maybeSingle.mockResolvedValue({ data: tool, error: null })

    const itToolsConflictQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      ilike: jest.fn(),
      neq: jest.fn(),
      maybeSingle: jest.fn(),
    }
    itToolsConflictQuery.select.mockReturnValue(itToolsConflictQuery)
    itToolsConflictQuery.eq.mockReturnValue(itToolsConflictQuery)
    itToolsConflictQuery.ilike.mockReturnValue(itToolsConflictQuery)
    itToolsConflictQuery.neq.mockReturnValue(itToolsConflictQuery)
    itToolsConflictQuery.maybeSingle.mockResolvedValue({ data: null, error: null })

    const itToolsUpdateQuery = {
      update: jest.fn(),
      eq: jest.fn(),
      select: jest.fn(),
      single: jest.fn(),
    }
    itToolsUpdateQuery.update.mockReturnValue(itToolsUpdateQuery)
    itToolsUpdateQuery.eq.mockReturnValue(itToolsUpdateQuery)
    itToolsUpdateQuery.select.mockReturnValue(itToolsUpdateQuery)
    itToolsUpdateQuery.single.mockResolvedValue({
      data: { ...tool, name: 'SAP S/4', description: 'Aktualisiert' },
      error: null,
    })

    const from = jest
      .fn()
      .mockImplementationOnce((table: string) => {
        if (table === 'it_tools') {
          return itToolsLookupQuery
        }
        throw new Error(`Unexpected table: ${table}`)
      })
      .mockImplementationOnce((table: string) => {
        if (table === 'it_tools') {
          return itToolsConflictQuery
        }
        throw new Error(`Unexpected table: ${table}`)
      })
      .mockImplementationOnce((table: string) => {
        if (table === 'it_tools') {
          return itToolsUpdateQuery
        }
        throw new Error(`Unexpected table: ${table}`)
      })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityResourcesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationRole: jest.fn().mockResolvedValue({ id: 'org-1', membership_role: 'owner' }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(ActivityResourcesService)

    await expect(
      service.updateOrganizationTool('user-1', 'org-1', 'tool-1', {
        name: ' SAP S/4 ',
        description: ' Aktualisiert ',
      }),
    ).resolves.toMatchObject({
      id: 'tool-1',
      name: 'SAP S/4',
      description: 'Aktualisiert',
    })
  })

  it('blocks deleting an IT tool that is still linked to activities', async () => {
    const tool = {
      id: 'tool-1',
      organization_id: 'org-1',
      name: 'SAP',
      description: 'ERP',
      created_at: new Date().toISOString(),
      created_by: 'user-1',
    }

    const itToolsQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn(),
    }
    itToolsQuery.select.mockReturnValue(itToolsQuery)
    itToolsQuery.eq.mockReturnValue(itToolsQuery)
    itToolsQuery.maybeSingle.mockResolvedValue({ data: tool, error: null })

    const activityItToolsQuery = {
      select: jest.fn(),
      eq: jest.fn(),
    }
    activityItToolsQuery.select.mockReturnValue(activityItToolsQuery)
    activityItToolsQuery.eq.mockResolvedValue({ count: 2, error: null })

    const from = jest
      .fn()
      .mockImplementationOnce((table: string) => {
        if (table === 'it_tools') {
          return itToolsQuery
        }
        throw new Error(`Unexpected table: ${table}`)
      })
      .mockImplementationOnce((table: string) => {
        if (table === 'activity_it_tools') {
          return activityItToolsQuery
        }
        throw new Error(`Unexpected table: ${table}`)
      })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityResourcesService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationRole: jest.fn().mockResolvedValue({ id: 'org-1', membership_role: 'owner' }),
            supabase: { from },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(ActivityResourcesService)

    await expect(service.deleteOrganizationTool('user-1', 'org-1', 'tool-1')).rejects.toBeInstanceOf(BadRequestException)
  })
})
