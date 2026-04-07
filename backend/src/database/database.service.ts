import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type OrganizationRole = 'owner' | 'admin' | 'member'

export interface OrganizationAccess {
  id: string
  name: string
  created_by: string | null
  created_at: string
  membership_role: OrganizationRole
}

export interface WorkspaceAccessRecord {
  id: string
  name: string
  created_by: string
  created_at: string
  organization_id: string
  parent_workspace_id: string | null
  parent_activity_id: string | null
  workflow_scope: 'standalone' | 'detail'
  purpose: string | null
  expected_inputs: string[]
  expected_outputs: string[]
}

@Injectable()
export class DatabaseService {
  readonly supabase: SupabaseClient

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL')
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')

    if (!url || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment')
    }

    this.supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  async assertWorkspaceAccess(workspaceId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new UnauthorizedException('Workspace access denied')
    }

    await this.assertOrganizationAccess(data.organization_id, userId)

    return data as WorkspaceAccessRecord
  }

  async listOrganizationsForUser(userId: string) {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('role, organizations(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true, referencedTable: 'organizations' })

    if (error) {
      throw error
    }

    return (data ?? [])
      .map((entry) => {
        const organization = Array.isArray(entry.organizations) ? entry.organizations[0] : entry.organizations
        if (!organization) {
          return null
        }

        return {
          ...(organization as Omit<OrganizationAccess, 'membership_role'>),
          membership_role: entry.role as OrganizationRole,
        } satisfies OrganizationAccess
      })
      .filter((entry): entry is OrganizationAccess => Boolean(entry))
  }

  async assertOrganizationAccess(organizationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('role, organizations(*)')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    const organization = data
      ? (Array.isArray(data.organizations) ? data.organizations[0] : data.organizations)
      : null

    if (!data || !organization) {
      throw new UnauthorizedException('Organization access denied')
    }

    return {
      ...(organization as Omit<OrganizationAccess, 'membership_role'>),
      membership_role: data.role as OrganizationRole,
    } satisfies OrganizationAccess
  }

  async assertOrganizationRole(organizationId: string, userId: string, roles: OrganizationRole[]) {
    const organization = await this.assertOrganizationAccess(organizationId, userId)
    if (!roles.includes(organization.membership_role)) {
      throw new UnauthorizedException('Organization role denied')
    }

    return organization
  }
}
