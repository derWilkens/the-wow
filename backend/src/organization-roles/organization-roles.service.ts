import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService } from '../database/database.service'
import { fallbackActivityAssignments, fallbackOrganizationRoles } from '../fallback-store'
import { CreateOrganizationRoleDto } from './dto/create-organization-role.dto'
import { UpdateOrganizationRoleDto } from './dto/update-organization-role.dto'

export interface OrganizationRoleRecord {
  id: string
  organization_id: string
  label: string
  acronym: string
  description: string | null
  sort_order: number
  created_at: string
  created_by: string | null
}

@Injectable()
export class OrganizationRolesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async getNextSortOrder(organizationId: string) {
    const { data, error } = await this.databaseService.supabase
      .from('organization_roles')
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

  private getNextFallbackSortOrder(organizationId: string) {
    const currentMax = Array.from(fallbackOrganizationRoles.values())
      .filter((role) => role.organization_id === organizationId)
      .reduce((max, role) => Math.max(max, role.sort_order), -1)

    return currentMax + 1
  }

  private rethrowRolesSchemaError(error: unknown): never {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
    const message = typeof error === 'object' && error !== null && 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''
    const schemaIsMissing = code === 'PGRST205' || message.includes('organization_roles') || message.includes('role_id')

    if (schemaIsMissing) {
      throw new BadRequestException('Rollen-Stammdaten sind noch nicht verfuegbar. Bitte Migration 013 anwenden und erneut versuchen.')
    }

    throw error
  }

  private isMissingRolesSchema(error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
    const message = typeof error === 'object' && error !== null && 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''
    return code === 'PGRST205' || message.includes('organization_roles') || message.includes('role_id')
  }

  private normalizeLabel(label: string) {
    return label.trim().replace(/\s+/g, ' ')
  }

  private normalizeAcronym(acronym: string) {
    return acronym
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase()
  }

  private deriveAcronym(label: string) {
    const tokens = label
      .replace(/[/-]+/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => Boolean(token) && !/^\d+$/.test(token))

    if (tokens.length === 0) {
      return 'R'
    }

    const acronym = tokens
      .map((token) => {
        if (/^[A-ZÄÖÜ0-9]{2,4}$/.test(token)) {
          return token
        }

        const normalizedUpper = token.toUpperCase()
        const knownShortforms = ['BIM', 'CAD', 'ERP', 'PLM', 'SAP', 'IT']
        if (knownShortforms.includes(normalizedUpper)) {
          return normalizedUpper
        }

        return normalizedUpper.charAt(0)
      })
      .join('')

    return acronym || 'R'
  }

  private resolveAcronym(label: string, acronym?: string | null) {
    const normalized = acronym ? this.normalizeAcronym(acronym) : ''
    if (normalized) {
      return normalized
    }

    return this.deriveAcronym(label)
  }

  private async getRole(organizationId: string, roleId: string) {
    const { data, error } = await this.databaseService.supabase
      .from('organization_roles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', roleId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data as OrganizationRoleRecord | null
  }

  async list(userId: string, organizationId: string) {
    try {
      await this.databaseService.assertOrganizationAccess(organizationId, userId)

      const { data, error } = await this.databaseService.supabase
        .from('organization_roles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []) as OrganizationRoleRecord[]
    } catch (error) {
      if (!this.isMissingRolesSchema(error)) {
        this.rethrowRolesSchemaError(error)
      }

      return Array.from(fallbackOrganizationRoles.values())
        .filter((role) => role.organization_id === organizationId)
        .sort((left, right) => left.sort_order - right.sort_order || left.label.localeCompare(right.label, 'de'))
    }
  }

  async create(userId: string, organizationId: string, dto: CreateOrganizationRoleDto) {
    try {
      await this.databaseService.assertOrganizationRole(organizationId, userId, ['owner', 'admin'])
      const label = this.normalizeLabel(dto.label)

      const { data: existing, error: existingError } = await this.databaseService.supabase
        .from('organization_roles')
        .select('*')
        .eq('organization_id', organizationId)
        .ilike('label', label)
        .maybeSingle()

      if (existingError) {
        throw existingError
      }

      if (existing) {
        return existing as OrganizationRoleRecord
      }

      const { data, error } = await this.databaseService.supabase
        .from('organization_roles')
        .insert({
          id: randomUUID(),
          organization_id: organizationId,
          label,
          acronym: this.resolveAcronym(label, dto.acronym),
          description: dto.description?.trim() || null,
          sort_order: await this.getNextSortOrder(organizationId),
          created_by: userId,
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data as OrganizationRoleRecord
    } catch (error) {
      if (!this.isMissingRolesSchema(error)) {
        this.rethrowRolesSchemaError(error)
      }

      const label = this.normalizeLabel(dto.label)
      const existing = Array.from(fallbackOrganizationRoles.values()).find(
        (role) => role.organization_id === organizationId && role.label.toLowerCase() === label.toLowerCase(),
      )
      if (existing) {
        return existing
      }

      const role: OrganizationRoleRecord = {
        id: randomUUID(),
        organization_id: organizationId,
        label,
        acronym: this.resolveAcronym(label, dto.acronym),
        description: dto.description?.trim() || null,
        sort_order: this.getNextFallbackSortOrder(organizationId),
        created_at: new Date().toISOString(),
        created_by: userId,
      }
      fallbackOrganizationRoles.set(role.id, role)
      return role
    }
  }

  async update(userId: string, organizationId: string, roleId: string, dto: UpdateOrganizationRoleDto) {
    try {
      await this.databaseService.assertOrganizationRole(organizationId, userId, ['owner', 'admin'])
      const role = await this.getRoleOrThrow(organizationId, roleId)

      const payload: Record<string, unknown> = {}
      let nextLabel: string | null = null
      if (dto.label !== undefined) {
        nextLabel = this.normalizeLabel(dto.label)
        const { data: existing, error: existingError } = await this.databaseService.supabase
          .from('organization_roles')
          .select('id')
          .eq('organization_id', organizationId)
          .ilike('label', nextLabel)
          .neq('id', roleId)
          .maybeSingle()

        if (existingError) {
          throw existingError
        }

        if (existing) {
          throw new BadRequestException('Eine Rolle mit diesem Namen existiert bereits.')
        }

        payload.label = nextLabel
      }

      if (dto.acronym !== undefined || nextLabel !== null) {
        payload.acronym = this.resolveAcronym(nextLabel ?? role.label, dto.acronym ?? role.acronym)
      }

      if (dto.description !== undefined) {
        payload.description = dto.description?.trim() || null
      }

      const { data, error } = await this.databaseService.supabase
        .from('organization_roles')
        .update(payload)
        .eq('organization_id', organizationId)
        .eq('id', roleId)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data as OrganizationRoleRecord
    } catch (error) {
      if (!this.isMissingRolesSchema(error)) {
        this.rethrowRolesSchemaError(error)
      }

      const role = await this.getFallbackRoleOrThrow(organizationId, roleId)
      const label = dto.label !== undefined ? this.normalizeLabel(dto.label) : role.label
      const conflicting = Array.from(fallbackOrganizationRoles.values()).find(
        (entry) =>
          entry.organization_id === organizationId &&
          entry.id !== roleId &&
          entry.label.toLowerCase() === label.toLowerCase(),
      )
      if (conflicting) {
        throw new BadRequestException('Eine Rolle mit diesem Namen existiert bereits.')
      }

      const updated: OrganizationRoleRecord = {
        ...role,
        label,
        acronym: dto.acronym !== undefined || dto.label !== undefined ? this.resolveAcronym(label, dto.acronym ?? role.acronym) : role.acronym,
        description: dto.description !== undefined ? dto.description?.trim() || null : role.description,
      }
      fallbackOrganizationRoles.set(roleId, updated)
      return updated
    }
  }

  async remove(userId: string, organizationId: string, roleId: string) {
    try {
      await this.databaseService.assertOrganizationRole(organizationId, userId, ['owner', 'admin'])
      await this.getRoleOrThrow(organizationId, roleId)

      const { count, error: linkedError } = await this.databaseService.supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('role_id', roleId)

      if (linkedError) {
        throw linkedError
      }

      if ((count ?? 0) > 0) {
        throw new BadRequestException('Rolle kann nicht geloescht werden, solange sie noch an Aktivitaeten verwendet wird.')
      }

      const { error } = await this.databaseService.supabase.from('organization_roles').delete().eq('id', roleId)
      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      if (!this.isMissingRolesSchema(error)) {
        this.rethrowRolesSchemaError(error)
      }

      await this.getFallbackRoleOrThrow(organizationId, roleId)
      const isLinked = Array.from(fallbackActivityAssignments.values()).some((entry) => entry.roleId === roleId)
      if (isLinked) {
        throw new BadRequestException('Rolle kann nicht geloescht werden, solange sie noch an Aktivitaeten verwendet wird.')
      }
      fallbackOrganizationRoles.delete(roleId)
      return { success: true }
    }
  }

  private async getRoleOrThrow(organizationId: string, roleId: string) {
    const role = await this.getRole(organizationId, roleId)
    if (!role) {
      throw new BadRequestException('Die ausgewaehlte Rolle wurde nicht gefunden.')
    }
    return role
  }

  private async getFallbackRoleOrThrow(organizationId: string, roleId: string) {
    const role = fallbackOrganizationRoles.get(roleId)
    if (!role || role.organization_id !== organizationId) {
      throw new BadRequestException('Die ausgewaehlte Rolle wurde nicht gefunden.')
    }
    return role
  }
}
