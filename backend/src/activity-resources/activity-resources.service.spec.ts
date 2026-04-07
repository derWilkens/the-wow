import { Test } from '@nestjs/testing'
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
})
