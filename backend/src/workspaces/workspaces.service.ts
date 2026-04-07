import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { CreateWorkspaceDto } from './dto/create-workspace.dto'

@Injectable()
export class WorkspacesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(userId: string, organizationId: string) {
    await this.databaseService.assertOrganizationAccess(organizationId, userId)

    const { data, error } = await this.databaseService.supabase
      .from('workspaces')
      .select('*')
      .eq('organization_id', organizationId)
      .order('workflow_scope', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return data ?? []
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    await this.databaseService.assertOrganizationAccess(dto.organization_id, userId)

    const payload = {
      name: dto.name.trim(),
      created_by: userId,
      organization_id: dto.organization_id,
      ...(dto.parent_workspace_id !== undefined ? { parent_workspace_id: dto.parent_workspace_id ?? null } : {}),
      ...(dto.parent_activity_id !== undefined ? { parent_activity_id: dto.parent_activity_id ?? null } : {}),
      ...(dto.workflow_scope !== undefined ? { workflow_scope: dto.workflow_scope } : {}),
      ...(dto.purpose !== undefined ? { purpose: dto.purpose ?? null } : {}),
      ...(dto.expected_inputs !== undefined ? { expected_inputs: dto.expected_inputs } : {}),
      ...(dto.expected_outputs !== undefined ? { expected_outputs: dto.expected_outputs } : {}),
    }

    const { data, error } = await this.databaseService.supabase
      .from('workspaces')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return data
  }

  async remove(userId: string, workspaceId: string) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
    const { error } = await this.databaseService.supabase.from('workspaces').delete().eq('id', workspaceId)
    if (error) {
      throw error
    }
    return { success: true }
  }
}
