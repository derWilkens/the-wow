import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService } from '../database/database.service'
import { UpsertCanvasObjectDto } from './dto/upsert-canvas-object.dto'

@Injectable()
export class CanvasObjectsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(userId: string, workspaceId: string, parentActivityId: string | null) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    let query = this.databaseService.supabase
      .from('canvas_objects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('edge_sort_order', { ascending: true })
      .order('name', { ascending: true })

    query = parentActivityId ? query.eq('parent_activity_id', parentActivityId) : query.is('parent_activity_id', null)

    const { data, error } = await query
    if (error) {
      throw error
    }

    const canvasObjects = (data ?? []).sort((left, right) => {
      if (left.object_type === 'quelle' && right.object_type === 'quelle') {
        return (left.position_x ?? 0) - (right.position_x ?? 0)
      }

      if (left.object_type === 'datenobjekt' && right.object_type === 'datenobjekt') {
        return (left.edge_sort_order ?? 0) - (right.edge_sort_order ?? 0)
      }

      return left.object_type === 'quelle' ? -1 : 1
    })
    if (canvasObjects.length === 0) {
      return []
    }

    const { data: fields, error: fieldsError } = await this.databaseService.supabase
      .from('object_fields')
      .select('*')
      .in('object_id', canvasObjects.map((item) => item.id))
      .order('sort_order', { ascending: true })

    if (fieldsError) {
      throw fieldsError
    }

    return canvasObjects.map((item) => ({
      ...item,
      fields: (fields ?? []).filter((field) => field.object_id === item.id),
    }))
  }

  async upsert(userId: string, workspaceId: string, dto: UpsertCanvasObjectDto) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    if (dto.object_type === 'datenobjekt' && !dto.edge_id) {
      throw new Error('datenobjekt requires edge_id')
    }

    const objectId = dto.id ?? randomUUID()
    const payload = {
      id: objectId,
      workspace_id: workspaceId,
      parent_activity_id: dto.parent_activity_id ?? null,
      object_type: dto.object_type,
      name: dto.name,
      edge_id: dto.object_type === 'datenobjekt' ? dto.edge_id ?? null : null,
      edge_sort_order: dto.object_type === 'datenobjekt' ? dto.edge_sort_order ?? 0 : null,
      position_x: dto.object_type === 'quelle' ? dto.position_x ?? 0 : null,
      position_y: dto.object_type === 'quelle' ? dto.position_y ?? 0 : null,
    }

    const { data, error } = await this.databaseService.supabase
      .from('canvas_objects')
      .upsert(payload)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    if (dto.object_type === 'datenobjekt' && dto.fields) {
      await this.databaseService.supabase.from('object_fields').delete().eq('object_id', objectId)
      if (dto.fields.length > 0) {
        const { error: fieldError } = await this.databaseService.supabase.from('object_fields').insert(
          dto.fields.map((field) => ({
            id: field.id ?? randomUUID(),
            object_id: objectId,
            name: field.name,
            field_type: field.field_type,
            required: field.required,
            sort_order: field.sort_order,
          })),
        )
        if (fieldError) {
          throw fieldError
        }
      }
    }

    const [fullObject] = await this.list(userId, workspaceId, dto.parent_activity_id ?? null)
    if (dto.parent_activity_id === null) {
      const objects = await this.list(userId, workspaceId, null)
      return objects.find((item) => item.id === objectId) ?? { ...data, fields: [] }
    }

    const objects = await this.list(userId, workspaceId, dto.parent_activity_id ?? null)
    return objects.find((item) => item.id === objectId) ?? fullObject ?? { ...data, fields: [] }
  }

  async remove(userId: string, workspaceId: string, id: string) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
    const { error } = await this.databaseService.supabase.from('canvas_objects').delete().eq('id', id).eq('workspace_id', workspaceId)
    if (error) {
      throw error
    }
    return { success: true }
  }
}
