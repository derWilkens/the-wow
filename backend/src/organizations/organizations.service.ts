import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService, type OrganizationRole } from '../database/database.service'
import { TransportModesService } from '../transport-modes/transport-modes.service'
import { WorkflowTemplatesService } from '../workflow-templates/workflow-templates.service'

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly transportModesService: TransportModesService,
    private readonly workflowTemplatesService: WorkflowTemplatesService,
  ) {}

  async list(userId: string) {
    return this.databaseService.listOrganizationsForUser(userId)
  }

  async create(userId: string, name: string) {
    const { data, error } = await this.databaseService.supabase
      .from('organizations')
      .insert({
        id: randomUUID(),
        name: name.trim(),
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    const { error: membershipError } = await this.databaseService.supabase
      .from('organization_members')
      .upsert({
        organization_id: data.id,
        user_id: userId,
        role: 'owner',
      })

    if (membershipError) {
      throw membershipError
    }

    await this.transportModesService.seedDefaultsForOrganization(data.id, userId)
    await this.workflowTemplatesService.seedDefaultsForOrganization(data.id, userId)

    return {
      ...data,
      membership_role: 'owner' as const,
    }
  }

  async update(userId: string, organizationId: string, name: string) {
    const organization = await this.databaseService.assertOrganizationRole(organizationId, userId, ['owner', 'admin'])

    const { data, error } = await this.databaseService.supabase
      .from('organizations')
      .update({
        name: name.trim(),
      })
      .eq('id', organizationId)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return {
      ...data,
      membership_role: organization.membership_role,
    }
  }

  async listMembers(userId: string, organizationId: string) {
    await this.databaseService.assertOrganizationAccess(organizationId, userId)

    const { data, error } = await this.databaseService.supabase
      .from('organization_members')
      .select('user_id, role, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    const userIds = [...new Set((data ?? []).map((item) => item.user_id).filter(Boolean))]
    if (userIds.length === 0) {
      return []
    }

    const { data: users, error: usersError } = await this.databaseService.supabase.auth.admin.listUsers()
    if (usersError) {
      throw usersError
    }

    return (data ?? []).map((member) => {
      const user = users.users.find((entry) => entry.id === member.user_id)
      const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>
      const email = user?.email ?? null
      const fallbackDisplayName = email ? email.split('@')[0] : member.user_id
      return {
        user_id: member.user_id,
        email,
        role: member.role as OrganizationRole,
        display_name:
          (typeof userMetadata.display_name === 'string' && userMetadata.display_name.trim()) ||
          (typeof userMetadata.full_name === 'string' && userMetadata.full_name.trim()) ||
          fallbackDisplayName,
        domain_role_label:
          (typeof userMetadata.domain_role_label === 'string' && userMetadata.domain_role_label.trim()) || null,
        created_at: member.created_at as string,
      }
    })
  }

  async createInvitation(userId: string, organizationId: string, input: { email: string; role?: 'admin' | 'member' }) {
    await this.databaseService.assertOrganizationRole(organizationId, userId, ['owner', 'admin'])

    const normalizedEmail = input.email.trim().toLowerCase()
    const role = input.role ?? 'member'

    const { data: existingMembership, error: membershipError } = await this.databaseService.supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .limit(100)

    if (membershipError) {
      throw membershipError
    }

    if ((existingMembership ?? []).length > 0) {
      const { data: users, error: usersError } = await this.databaseService.supabase.auth.admin.listUsers()
      if (usersError) {
        throw usersError
      }

      const memberEmails = new Set(
        (existingMembership ?? [])
          .map((entry) => users.users.find((user) => user.id === entry.user_id)?.email?.toLowerCase())
          .filter((email): email is string => Boolean(email)),
      )

      if (memberEmails.has(normalizedEmail)) {
        return {
          email: normalizedEmail,
          role,
          already_member: true,
        }
      }
    }

    const { data: existingInvitation, error: existingInvitationError } = await this.databaseService.supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('email', normalizedEmail)
      .is('accepted_at', null)
      .maybeSingle()

    if (existingInvitationError) {
      throw existingInvitationError
    }

    if (existingInvitation) {
      const { data, error } = await this.databaseService.supabase
        .from('organization_invitations')
        .update({
          role,
          invited_by: userId,
          token: randomUUID(),
        })
        .eq('id', existingInvitation.id)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return {
        ...data,
        already_member: false,
      }
    }

    const { data, error } = await this.databaseService.supabase
      .from('organization_invitations')
      .insert({
        id: randomUUID(),
        organization_id: organizationId,
        email: normalizedEmail,
        role,
        invited_by: userId,
        token: randomUUID(),
        accepted_at: null,
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return {
      ...data,
      already_member: false,
    }
  }

  async listPendingInvitations(userId: string, email: string | undefined) {
    if (!email) {
      return []
    }

    const { data, error } = await this.databaseService.supabase
      .from('organization_invitations')
      .select('*, organizations(*)')
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return (data ?? []).map((entry) => ({
      id: entry.id as string,
      email: entry.email as string,
      role: entry.role as OrganizationRole,
      token: entry.token as string,
      created_at: entry.created_at as string,
      organization: (Array.isArray(entry.organizations) ? entry.organizations[0] : entry.organizations) as {
        id: string
        name: string
        created_by: string | null
        created_at: string
      },
    }))
  }

  async acceptInvitation(userId: string, email: string | undefined, invitationId: string) {
    if (!email) {
      throw new Error('User email is required to accept invitations')
    }

    const { data, error } = await this.databaseService.supabase
      .from('organization_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Invitation not found')
    }

    const { error: membershipError } = await this.databaseService.supabase
      .from('organization_members')
      .upsert({
        organization_id: data.organization_id,
        user_id: userId,
        role: data.role,
      })

    if (membershipError) {
      throw membershipError
    }

    const { error: acceptError } = await this.databaseService.supabase
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitationId)

    if (acceptError) {
      throw acceptError
    }

    return this.databaseService.assertOrganizationAccess(data.organization_id as string, userId)
  }
}
