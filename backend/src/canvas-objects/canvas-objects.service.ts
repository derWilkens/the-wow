import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService } from '../database/database.service'
import { fallbackCanvasObjectLayers } from '../fallback-store'
import { UpsertCanvasObjectDto } from './dto/upsert-canvas-object.dto'

@Injectable()
export class CanvasObjectsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private normalizeObject<T extends { is_locked?: boolean | null; z_index?: number | null }>(record: T) {
    const fallbackLayer = 'id' in record ? fallbackCanvasObjectLayers.get(String(record.id)) : null
    return {
      ...record,
      is_locked: Boolean(record.is_locked),
      z_index: typeof record.z_index === 'number' ? record.z_index : (fallbackLayer?.zIndex ?? 0),
    }
  }

  private isMissingZIndexSchema(error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : ''

    return code === 'PGRST204' || code === 'PGRST205' || code === '42703' || message.includes('z_index')
  }

  private sortCanvasObjects<T extends { object_type?: string | null; z_index?: number | null; position_x?: number | null; edge_sort_order?: number | null }>(
    canvasObjects: T[],
  ) {
    return [...canvasObjects].sort((left, right) => {
      const leftZIndex = typeof left.z_index === 'number' ? left.z_index : 0
      const rightZIndex = typeof right.z_index === 'number' ? right.z_index : 0
      if (leftZIndex !== rightZIndex) {
        return leftZIndex - rightZIndex
      }

      if (left.object_type === 'quelle' && right.object_type === 'quelle') {
        return (left.position_x ?? 0) - (right.position_x ?? 0)
      }

      if (left.object_type === 'datenobjekt' && right.object_type === 'datenobjekt') {
        return (left.edge_sort_order ?? 0) - (right.edge_sort_order ?? 0)
      }

      return left.object_type === 'quelle' ? -1 : 1
    })
  }

  async list(userId: string, workspaceId: string, parentActivityId: string | null) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    const fetchObjects = async (includeZIndexOrder: boolean) => {
      let query = this.databaseService.supabase.from('canvas_objects').select('*').eq('workspace_id', workspaceId)

      if (includeZIndexOrder) {
        query = query.order('z_index', { ascending: true })
      }

      query = query.order('edge_sort_order', { ascending: true }).order('name', { ascending: true })
      query = parentActivityId ? query.eq('parent_activity_id', parentActivityId) : query.is('parent_activity_id', null)

      return query
    }

    let data
    try {
      const result = await fetchObjects(true)
      if (result.error) {
        throw result.error
      }
      data = result.data
    } catch (error) {
      if (!this.isMissingZIndexSchema(error)) {
        throw error
      }

      const fallbackResult = await fetchObjects(false)
      if (fallbackResult.error) {
        throw fallbackResult.error
      }
      data = fallbackResult.data
    }
    const canvasObjects = this.sortCanvasObjects(data ?? [])
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
      ...this.normalizeObject(item),
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
      ...(dto.group_id !== undefined ? { group_id: dto.group_id ?? null } : {}),
      object_type: dto.object_type,
      name: dto.name,
      ...(dto.is_locked !== undefined ? { is_locked: dto.is_locked } : {}),
      ...(dto.z_index !== undefined ? { z_index: dto.z_index } : { z_index: 0 }),
      edge_id: dto.object_type === 'datenobjekt' ? dto.edge_id ?? null : null,
      edge_sort_order: dto.object_type === 'datenobjekt' ? dto.edge_sort_order ?? 0 : null,
      position_x: dto.object_type === 'quelle' ? dto.position_x ?? 0 : null,
      position_y: dto.object_type === 'quelle' ? dto.position_y ?? 0 : null,
    }

    let data
    try {
      const result = await this.databaseService.supabase.from('canvas_objects').upsert(payload).select('*').single()
      if (result.error) {
        throw result.error
      }
      data = result.data
    } catch (error) {
      if (!this.isMissingZIndexSchema(error)) {
        throw error
      }

      const { z_index: _ignoredZIndex, ...fallbackPayload } = payload
      const fallbackResult = await this.databaseService.supabase.from('canvas_objects').upsert(fallbackPayload).select('*').single()
      if (fallbackResult.error) {
        throw fallbackResult.error
      }
      data = {
        ...fallbackResult.data,
        z_index: dto.z_index ?? 0,
      }
      fallbackCanvasObjectLayers.set(objectId, {
        objectId,
        zIndex: dto.z_index ?? 0,
      })
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
      return objects.find((item) => item.id === objectId) ?? { ...this.normalizeObject(data), fields: [] }
    }

    const objects = await this.list(userId, workspaceId, dto.parent_activity_id ?? null)
    return objects.find((item) => item.id === objectId) ?? fullObject ?? { ...this.normalizeObject(data), fields: [] }
  }

  async remove(userId: string, workspaceId: string, id: string) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
    const { error } = await this.databaseService.supabase.from('canvas_objects').delete().eq('id', id).eq('workspace_id', workspaceId)
    if (error) {
      throw error
    }
    fallbackCanvasObjectLayers.delete(id)
    return { success: true }
  }
}
