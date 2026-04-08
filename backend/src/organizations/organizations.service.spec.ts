import { Test } from '@nestjs/testing'
import { DatabaseService } from '../database/database.service'
import { TransportModesService } from '../transport-modes/transport-modes.service'
import { WorkflowTemplatesService } from '../workflow-templates/workflow-templates.service'
import { OrganizationsService } from './organizations.service'

describe('OrganizationsService', () => {
  it('updates the organization name and preserves the membership role', async () => {
    const organizationsQuery = {
      update: jest.fn(),
      eq: jest.fn(),
      select: jest.fn(),
      single: jest.fn(),
    }
    organizationsQuery.update.mockReturnValue(organizationsQuery)
    organizationsQuery.eq.mockReturnValue(organizationsQuery)
    organizationsQuery.select.mockReturnValue(organizationsQuery)
    organizationsQuery.single.mockResolvedValue({
      data: {
        id: 'org-1',
        name: 'Neue Firma',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
      },
      error: null,
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: DatabaseService,
          useValue: {
            assertOrganizationRole: jest.fn().mockResolvedValue({
              id: 'org-1',
              name: 'Alte Firma',
              membership_role: 'owner',
            }),
            supabase: {
              from: jest.fn((table: string) => {
                if (table === 'organizations') {
                  return organizationsQuery
                }
                throw new Error(`Unexpected table: ${table}`)
              }),
            },
          },
        },
        { provide: TransportModesService, useValue: {} },
        { provide: WorkflowTemplatesService, useValue: {} },
      ],
    }).compile()

    const service = moduleRef.get(OrganizationsService)

    await expect(service.update('user-1', 'org-1', ' Neue Firma ')).resolves.toMatchObject({
      id: 'org-1',
      name: 'Neue Firma',
      membership_role: 'owner',
    })
    expect(organizationsQuery.update).toHaveBeenCalledWith({ name: 'Neue Firma' })
  })
})
