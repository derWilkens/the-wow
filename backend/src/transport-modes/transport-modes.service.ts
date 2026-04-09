import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService } from '../database/database.service'
import { defaultTransportModes } from './default-transport-modes'
import { CreateTransportModeDto } from './dto/create-transport-mode.dto'
import { UpdateTransportModeDto } from './dto/update-transport-mode.dto'

function slugifyTransportMode(label: string) {
  const normalized = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || `modus_${randomUUID().slice(0, 8)}`
}

@Injectable()
export class TransportModesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async getNextSortOrder(organizationId: string) {
    const { data, error } = await this.databaseService.supabase
      .from('transport_modes')
      .select('sort_order')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    return ((data as { sort_order?: number } | null)?.sort_order ?? -1) + 1
  }

  async seedDefaultsForOrganization(organizationId: string, createdBy: string | null) {
    const { error } = await this.databaseService.supabase.from('transport_modes').upsert(
      defaultTransportModes.map((mode) => ({
        id: randomUUID(),
        organization_id: organizationId,
        key: mode.key,
        label: mode.label,
        description: mode.description,
        sort_order: mode.sort_order,
        is_active: true,
        is_default: mode.is_default,
        created_by: createdBy,
      })),
      { onConflict: 'organization_id,key', ignoreDuplicates: true },
    )

    if (error && !String(error.message ?? '').includes('transport_modes')) {
      throw error
    }
  }

  private async ensureTransportModeBelongsToOrganization(organizationId: string, transportModeId: string) {
    const { data, error } = await this.databaseService.supabase
      .from('transport_modes')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', transportModeId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  }

  async list(userId: string, organizationId: string) {
    await this.databaseService.assertOrganizationAccess(organizationId, userId)

    const { data, error } = await this.databaseService.supabase
      .from('transport_modes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      if (String(error.message ?? '').includes('transport_modes')) {
        return defaultTransportModes.map((mode, index) => ({
          id: `fallback-${mode.key}`,
          organization_id: organizationId,
          key: mode.key,
          label: mode.label,
          description: mode.description,
          sort_order: index,
          is_active: true,
          is_default: mode.is_default,
          created_at: new Date(0).toISOString(),
          created_by: null,
        }))
      }
      throw error
    }

    return data ?? []
  }

  async create(userId: string, organizationId: string, dto: CreateTransportModeDto) {
    await this.databaseService.assertOrganizationRole(organizationId, userId, ['owner', 'admin'])

    const label = dto.label.trim()
    const payload = {
      id: randomUUID(),
      organization_id: organizationId,
      key: slugifyTransportMode(label),
      label,
      description: dto.description?.trim() || null,
      sort_order: dto.sort_order ?? (await this.getNextSortOrder(organizationId)),
      is_active: true,
      is_default: dto.is_default ?? false,
      created_by: userId,
    }

    const { data, error } = await this.databaseService.supabase
      .from('transport_modes')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    if (payload.is_default) {
      await this.clearOtherDefaults(organizationId, data.id)
    }

    return data
  }

  async update(userId: string, organizationId: string, transportModeId: string, dto: UpdateTransportModeDto) {
    await this.databaseService.assertOrganizationRole(organizationId, userId, ['owner', 'admin'])
    await this.ensureTransportModeBelongsToOrganization(organizationId, transportModeId)

    const payload: Record<string, unknown> = {}
    if (dto.label !== undefined) {
      payload.label = dto.label.trim()
      payload.key = slugifyTransportMode(dto.label)
    }
    if (dto.description !== undefined) {
      payload.description = dto.description?.trim() || null
    }
    if (dto.sort_order !== undefined) {
      payload.sort_order = dto.sort_order
    }
    if (dto.is_default !== undefined) {
      payload.is_default = dto.is_default
    }

    const { data, error } = await this.databaseService.supabase
      .from('transport_modes')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', transportModeId)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    if (dto.is_default) {
      await this.clearOtherDefaults(organizationId, transportModeId)
    }

    return data
  }

  async deactivate(userId: string, organizationId: string, transportModeId: string) {
    await this.databaseService.assertOrganizationRole(organizationId, userId, ['owner', 'admin'])
    await this.ensureTransportModeBelongsToOrganization(organizationId, transportModeId)

    const { data, error } = await this.databaseService.supabase
      .from('transport_modes')
      .update({ is_active: false, is_default: false })
      .eq('organization_id', organizationId)
      .eq('id', transportModeId)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return data
  }

  private async clearOtherDefaults(organizationId: string, activeId: string) {
    const { error } = await this.databaseService.supabase
      .from('transport_modes')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .neq('id', activeId)

    if (error) {
      throw error
    }
  }
}
