import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService } from '../database/database.service'

export interface ITToolRecord {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_at: string
  created_by: string | null
}

@Injectable()
export class ActivityResourcesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private rethrowITToolsSchemaError(error: unknown): never {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
    const message = typeof error === 'object' && error !== null && 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''
    const schemaIsMissing =
      code === 'PGRST205' ||
      message.includes('it_tools') ||
      message.includes('activity_it_tools')

    if (schemaIsMissing) {
      throw new BadRequestException('IT-Tool catalog fields are not available yet. Apply migration 008_it_tools_catalog.sql and retry.')
    }

    throw error
  }

  private async assertActivityAccess(userId: string, workspaceId: string, activityId: string) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
    const { data, error } = await this.databaseService.supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  }

  private normalizeToolName(name: string) {
    return name.trim().replace(/\s+/g, ' ')
  }

  private async getToolById(toolId: string) {
    const { data, error } = await this.databaseService.supabase
      .from('it_tools')
      .select('*')
      .eq('id', toolId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data as ITToolRecord | null
  }

  async listAvailableTools(userId: string, workspaceId: string) {
    try {
      const workspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
      const { data, error } = await this.databaseService.supabase
        .from('it_tools')
        .select('*')
        .eq('organization_id', workspace.organization_id)
        .order('name')

      if (error) {
        throw error
      }

      return (data ?? []) as ITToolRecord[]
    } catch (error) {
      this.rethrowITToolsSchemaError(error)
    }
  }

  async createTool(userId: string, workspaceId: string, input: { name: string; description?: string | null }) {
    try {
      const workspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

      const normalizedName = this.normalizeToolName(input.name)
      const normalizedDescription = input.description?.trim() ? input.description.trim() : null

      const { data: existingTool, error: existingToolError } = await this.databaseService.supabase
        .from('it_tools')
        .select('*')
        .eq('organization_id', workspace.organization_id)
        .ilike('name', normalizedName)
        .maybeSingle()

      if (existingToolError) {
        throw existingToolError
      }

      if (existingTool) {
        return existingTool as ITToolRecord
      }

      const { data, error } = await this.databaseService.supabase
        .from('it_tools')
        .insert({
          id: randomUUID(),
          organization_id: workspace.organization_id,
          name: normalizedName,
          description: normalizedDescription,
          created_by: userId,
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data as ITToolRecord
    } catch (error) {
      this.rethrowITToolsSchemaError(error)
    }
  }

  async listTools(userId: string, workspaceId: string, activityId: string) {
    try {
      await this.assertActivityAccess(userId, workspaceId, activityId)
      const { data: links, error: linksError } = await this.databaseService.supabase
        .from('activity_it_tools')
        .select('tool_id')
        .eq('activity_id', activityId)

      if (linksError) {
        throw linksError
      }

      const toolIds = [...new Set((links ?? []).map((link) => link.tool_id).filter(Boolean))]
      if (toolIds.length === 0) {
        return []
      }

      const { data, error } = await this.databaseService.supabase.from('it_tools').select('*').in('id', toolIds).order('name')

      if (error) {
        throw error
      }

      return (data ?? []) as ITToolRecord[]
    } catch (error) {
      this.rethrowITToolsSchemaError(error)
    }
  }

  async linkTool(userId: string, workspaceId: string, activityId: string, toolId: string) {
    try {
      const workspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
      await this.assertActivityAccess(userId, workspaceId, activityId)
      const tool = await this.getToolById(toolId)
      if (!tool) {
        throw new Error('IT tool not found')
      }
      if (tool.organization_id !== workspace.organization_id) {
        throw new Error('IT tool does not belong to this organization')
      }

      const { error } = await this.databaseService.supabase
        .from('activity_it_tools')
        .upsert({ activity_id: activityId, tool_id: toolId })

      if (error) {
        throw error
      }

      return tool
    } catch (error) {
      this.rethrowITToolsSchemaError(error)
    }
  }

  async removeTool(userId: string, workspaceId: string, activityId: string, toolId: string) {
    try {
      await this.assertActivityAccess(userId, workspaceId, activityId)
      const { error } = await this.databaseService.supabase
        .from('activity_it_tools')
        .delete()
        .eq('activity_id', activityId)
        .eq('tool_id', toolId)

      if (error) {
        throw error
      }
      return { success: true }
    } catch (error) {
      this.rethrowITToolsSchemaError(error)
    }
  }

  async listCheckSources(userId: string, workspaceId: string, activityId: string) {
    await this.assertActivityAccess(userId, workspaceId, activityId)
    const { data, error } = await this.databaseService.supabase.from('activity_check_sources').select('*').eq('activity_id', activityId)
    if (error) {
      throw error
    }
    return data ?? []
  }

  async addCheckSource(
    userId: string,
    workspaceId: string,
    activityId: string,
    dto: { canvas_object_id: string; notes?: string | null },
  ) {
    await this.assertActivityAccess(userId, workspaceId, activityId)
    const { data, error } = await this.databaseService.supabase
      .from('activity_check_sources')
      .insert({
        id: randomUUID(),
        activity_id: activityId,
        canvas_object_id: dto.canvas_object_id,
        notes: dto.notes ?? null,
      })
      .select('*')
      .single()
    if (error) {
      throw error
    }
    return data
  }

  async removeCheckSource(userId: string, workspaceId: string, activityId: string, id: string) {
    await this.assertActivityAccess(userId, workspaceId, activityId)
    const { error } = await this.databaseService.supabase.from('activity_check_sources').delete().eq('id', id).eq('activity_id', activityId)
    if (error) {
      throw error
    }
    return { success: true }
  }
}
