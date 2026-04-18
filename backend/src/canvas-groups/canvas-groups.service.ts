import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService } from '../database/database.service'
import { UpsertCanvasGroupDto } from './dto/upsert-canvas-group.dto'

@Injectable()
export class CanvasGroupsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private normalizeGroup<T extends { locked?: boolean | null; collapsed?: boolean | null; z_index?: number | null }>(record: T) {
    return {
      ...record,
      locked: Boolean(record.locked),
      collapsed: Boolean(record.collapsed),
      z_index: typeof record.z_index === 'number' ? record.z_index : 0,
    }
  }

  async list(userId: string, workspaceId: string, parentActivityId: string | null) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    let query = this.databaseService.supabase
      .from('canvas_groups')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('z_index', { ascending: true })
      .order('created_at', { ascending: true })

    query = parentActivityId ? query.eq('parent_activity_id', parentActivityId) : query.is('parent_activity_id', null)

    const { data, error } = await query
    if (error) {
      throw error
    }

    return (data ?? []).map((group) => this.normalizeGroup(group))
  }

  async upsert(userId: string, workspaceId: string, dto: UpsertCanvasGroupDto) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    const payload = {
      id: dto.id ?? randomUUID(),
      workspace_id: workspaceId,
      parent_activity_id: dto.parent_activity_id ?? null,
      label: dto.label,
      position_x: dto.position_x,
      position_y: dto.position_y,
      width: dto.width,
      height: dto.height,
      locked: dto.locked ?? false,
      collapsed: dto.collapsed ?? false,
      z_index: dto.z_index ?? 0,
      created_by: userId,
    }

    const { data, error } = await this.databaseService.supabase
      .from('canvas_groups')
      .upsert(payload)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return this.normalizeGroup(data)
  }

  async remove(userId: string, workspaceId: string, id: string) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    const { error: unlinkActivitiesError } = await this.databaseService.supabase
      .from('activities')
      .update({ group_id: null })
      .eq('workspace_id', workspaceId)
      .eq('group_id', id)

    if (unlinkActivitiesError) {
      throw unlinkActivitiesError
    }

    const { error: unlinkCanvasObjectsError } = await this.databaseService.supabase
      .from('canvas_objects')
      .update({ group_id: null })
      .eq('workspace_id', workspaceId)
      .eq('group_id', id)

    if (unlinkCanvasObjectsError) {
      throw unlinkCanvasObjectsError
    }

    const { error } = await this.databaseService.supabase.from('canvas_groups').delete().eq('workspace_id', workspaceId).eq('id', id)
    if (error) {
      throw error
    }

    return { success: true }
  }
}
