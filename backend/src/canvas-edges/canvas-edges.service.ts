import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService } from '../database/database.service'
import { UpsertCanvasEdgeDto } from './dto/upsert-canvas-edge.dto'

@Injectable()
export class CanvasEdgesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private hasMissingAttributeColumns(error: unknown) {
    if (!error || typeof error !== 'object') {
      return false
    }

    const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
    return (
      message.includes('transport_mode') ||
      message.includes('transport_mode_id') ||
      message.includes('transport_modes') ||
      message.includes('notes')
    )
  }

  private normalizeEdge(edge: Record<string, unknown> | null) {
    if (!edge) {
      return edge
    }

    const transportMode = edge.transport_mode
    return {
      ...edge,
      transport_mode_id: (edge.transport_mode_id as string | null | undefined) ?? null,
      transport_mode:
        transportMode && !Array.isArray(transportMode)
          ? transportMode
          : Array.isArray(transportMode)
            ? (transportMode[0] ?? null)
            : null,
      notes: (edge.notes as string | null | undefined) ?? null,
    }
  }

  async list(userId: string, workspaceId: string, parentActivityId: string | null) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    let query = this.databaseService.supabase
      .from('canvas_edges')
      .select('*, transport_mode:transport_modes(*)')
      .eq('workspace_id', workspaceId)

    query = parentActivityId ? query.eq('parent_activity_id', parentActivityId) : query.is('parent_activity_id', null)

    const primaryResult = await query
    if (primaryResult.error) {
      if (!this.hasMissingAttributeColumns(primaryResult.error)) {
        throw primaryResult.error
      }

      const fallbackQuery = this.databaseService.supabase
        .from('canvas_edges')
        .select('*')
        .eq('workspace_id', workspaceId)

      const fallbackResult = await (parentActivityId
        ? fallbackQuery.eq('parent_activity_id', parentActivityId)
        : fallbackQuery.is('parent_activity_id', null))

      if (fallbackResult.error) {
        throw fallbackResult.error
      }

      return (fallbackResult.data ?? []).map((edge) => this.normalizeEdge(edge))
    }

    return (primaryResult.data ?? []).map((edge) => this.normalizeEdge(edge))
  }

  async upsert(userId: string, workspaceId: string, dto: UpsertCanvasEdgeDto) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
    const edgeId = dto.id ?? randomUUID()
    const payload = {
      id: edgeId,
      workspace_id: workspaceId,
      parent_activity_id: dto.parent_activity_id ?? null,
      from_node_type: dto.from_node_type,
      from_node_id: dto.from_node_id,
      from_handle_id: dto.from_handle_id ?? null,
      to_node_type: dto.to_node_type,
      to_node_id: dto.to_node_id,
      to_handle_id: dto.to_handle_id ?? null,
      label: dto.label ?? null,
      transport_mode_id: dto.transport_mode_id ?? null,
      notes: dto.notes ?? null,
    }

    const primaryResult = await this.databaseService.supabase
      .from('canvas_edges')
      .upsert(payload)
      .select('*, transport_mode:transport_modes(*)')
      .single()

    if (!primaryResult.error) {
      return this.normalizeEdge(primaryResult.data)
    }

    if (!this.hasMissingAttributeColumns(primaryResult.error)) {
      throw primaryResult.error
    }

    const fallbackResult = await this.databaseService.supabase
      .from('canvas_edges')
      .upsert({
        id: edgeId,
        workspace_id: workspaceId,
        parent_activity_id: dto.parent_activity_id ?? null,
        from_node_type: dto.from_node_type,
        from_node_id: dto.from_node_id,
        from_handle_id: dto.from_handle_id ?? null,
        to_node_type: dto.to_node_type,
        to_node_id: dto.to_node_id,
        to_handle_id: dto.to_handle_id ?? null,
        label: dto.label ?? null,
      })
      .select('*, transport_mode:transport_modes(*)')
      .single()

    if (fallbackResult.error) {
      throw fallbackResult.error
    }

    return this.normalizeEdge({
      ...fallbackResult.data,
      transport_mode_id: dto.transport_mode_id ?? null,
      notes: dto.notes ?? null,
    })
  }

  async remove(userId: string, workspaceId: string, id: string) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
    const { error } = await this.databaseService.supabase.from('canvas_edges').delete().eq('id', id).eq('workspace_id', workspaceId)
    if (error) {
      throw error
    }
    return { success: true }
  }
}
