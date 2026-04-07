import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService } from '../database/database.service'
import { fallbackWorkflowTemplates } from '../fallback-store'
import { defaultWorkflowTemplates } from './default-workflow-templates'

type TemplateSnapshot = {
  rootWorkspace: {
    name: string
    purpose: string | null
    expected_inputs: string[]
    expected_outputs: string[]
  }
  workspaces: Array<{
    tempId: string
    parentWorkspaceTempId: string | null
    parentActivityTempId: string | null
    name: string
    workflow_scope: 'standalone' | 'detail'
    purpose: string | null
    expected_inputs: string[]
    expected_outputs: string[]
  }>
  activities: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
  canvasObjects: Array<Record<string, unknown>>
}

type TemplateNodeType = 'activity' | 'quelle' | 'datenobjekt'

function isMissingTemplateSchema(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : ''

  return message.includes('workflow_templates') || message.includes('snapshot')
}

function isMissingTemplateConstraint(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : ''

  return (
    message.includes('organization_id,name') ||
    message.includes('no unique or exclusion constraint') ||
    message.includes('there is no unique or exclusion constraint')
  )
}

@Injectable()
export class WorkflowTemplatesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private normalizeSnapshot(snapshot: Record<string, unknown>) {
    const workspaces = Array.isArray(snapshot.workspaces) ? snapshot.workspaces : []
    const activities = Array.isArray(snapshot.activities) ? snapshot.activities : []
    const edges = Array.isArray(snapshot.edges) ? snapshot.edges : []
    const canvasObjects = Array.isArray(snapshot.canvasObjects) ? snapshot.canvasObjects : []

    const activityNodeTypes = new Map<string, TemplateNodeType>()
    for (const activity of activities) {
      const tempId = String((activity as Record<string, unknown>).tempId ?? '')
      if (tempId) {
        activityNodeTypes.set(tempId, 'activity')
      }
    }

    const objectNodeTypes = new Map<string, TemplateNodeType>()
    for (const canvasObject of canvasObjects) {
      const objectRecord = canvasObject as Record<string, unknown>
      const tempId = String(objectRecord.tempId ?? '')
      const objectType = objectRecord.object_type
      if (!tempId) {
        continue
      }

      if (objectType === 'quelle') {
        objectNodeTypes.set(tempId, 'quelle')
      } else if (objectType === 'datenobjekt') {
        objectNodeTypes.set(tempId, 'datenobjekt')
      }
    }

    const normalizedEdges = edges.map((edge) => {
      const edgeRecord = edge as Record<string, unknown>
      const legacyFrom = edgeRecord.from
      const legacyTo = edgeRecord.to
      const fromTempId = String(edgeRecord.from_node_temp_id ?? legacyFrom ?? '')
      const toTempId = String(edgeRecord.to_node_temp_id ?? legacyTo ?? '')

      if (!fromTempId || !toTempId) {
        throw new BadRequestException('Vorlage enthaelt ungueltige Verbindungen.')
      }

      const fromNodeType =
        (edgeRecord.from_node_type as string | undefined) ??
        activityNodeTypes.get(fromTempId) ??
        objectNodeTypes.get(fromTempId)
      const toNodeType =
        (edgeRecord.to_node_type as string | undefined) ??
        activityNodeTypes.get(toTempId) ??
        objectNodeTypes.get(toTempId)

      if (!fromNodeType || !toNodeType) {
        throw new BadRequestException('Vorlage enthaelt Verbindungen zu unbekannten Elementen.')
      }

      return {
        tempId: String(edgeRecord.tempId),
        workspaceTempId: String(edgeRecord.workspaceTempId ?? 'root'),
        parentActivityTempId: edgeRecord.parentActivityTempId ? String(edgeRecord.parentActivityTempId) : null,
        from_node_type: fromNodeType,
        from_node_temp_id: fromTempId,
        from_handle_id: edgeRecord.from_handle_id ?? null,
        to_node_type: toNodeType,
        to_node_temp_id: toTempId,
        to_handle_id: edgeRecord.to_handle_id ?? null,
        label: edgeRecord.label ?? null,
        transport_mode_id: edgeRecord.transport_mode_id ?? null,
        notes: edgeRecord.notes ?? null,
      }
    })

    return {
      rootWorkspace: {
        name: String((snapshot.rootWorkspace as Record<string, unknown> | undefined)?.name ?? 'Vorlage'),
        purpose: ((snapshot.rootWorkspace as Record<string, unknown> | undefined)?.purpose as string | null) ?? null,
        expected_inputs:
          (((snapshot.rootWorkspace as Record<string, unknown> | undefined)?.expected_inputs as string[]) ?? []),
        expected_outputs:
          (((snapshot.rootWorkspace as Record<string, unknown> | undefined)?.expected_outputs as string[]) ?? []),
      },
      workspaces: workspaces.map((workspace) => {
        const workspaceRecord = workspace as Record<string, unknown>
        return {
          tempId: String(workspaceRecord.tempId),
          parentWorkspaceTempId: workspaceRecord.parentWorkspaceTempId
            ? String(workspaceRecord.parentWorkspaceTempId)
            : null,
          parentActivityTempId: workspaceRecord.parentActivityTempId
            ? String(workspaceRecord.parentActivityTempId)
            : null,
          name: String(workspaceRecord.name),
          workflow_scope:
            (workspaceRecord.workflow_scope as 'standalone' | 'detail' | undefined) ?? 'detail',
          purpose: (workspaceRecord.purpose as string | null) ?? null,
          expected_inputs: (workspaceRecord.expected_inputs as string[]) ?? [],
          expected_outputs: (workspaceRecord.expected_outputs as string[]) ?? [],
        }
      }),
      activities: activities.map((activity) => {
        const activityRecord = activity as Record<string, unknown>
        return {
          tempId: String(activityRecord.tempId),
          workspaceTempId: String(activityRecord.workspaceTempId ?? 'root'),
          parentTempId: activityRecord.parentTempId ? String(activityRecord.parentTempId) : null,
          linkedWorkflowTempId: activityRecord.linkedWorkflowTempId
            ? String(activityRecord.linkedWorkflowTempId)
            : null,
          node_type: activityRecord.node_type,
          label: activityRecord.label,
          trigger_type: activityRecord.trigger_type ?? null,
          position_x: activityRecord.position_x ?? 0,
          position_y: activityRecord.position_y ?? 0,
          status: activityRecord.status ?? 'draft',
          status_icon: activityRecord.status_icon ?? null,
          activity_type: activityRecord.activity_type ?? null,
          description: activityRecord.description ?? null,
          notes: activityRecord.notes ?? null,
          duration_minutes: activityRecord.duration_minutes ?? null,
          linked_workflow_mode: activityRecord.linked_workflow_mode ?? null,
          linked_workflow_purpose: activityRecord.linked_workflow_purpose ?? null,
          linked_workflow_inputs: (activityRecord.linked_workflow_inputs as string[]) ?? [],
          linked_workflow_outputs: (activityRecord.linked_workflow_outputs as string[]) ?? [],
        }
      }),
      edges: normalizedEdges,
      canvasObjects: canvasObjects.map((canvasObject) => {
        const objectRecord = canvasObject as Record<string, unknown>
        return {
          tempId: String(objectRecord.tempId),
          workspaceTempId: String(objectRecord.workspaceTempId ?? 'root'),
          parentActivityTempId: objectRecord.parentActivityTempId ? String(objectRecord.parentActivityTempId) : null,
          object_type: objectRecord.object_type,
          name: objectRecord.name,
          edgeTempId: objectRecord.edgeTempId ? String(objectRecord.edgeTempId) : null,
          edge_sort_order: objectRecord.edge_sort_order ?? null,
          position_x: objectRecord.position_x ?? null,
          position_y: objectRecord.position_y ?? null,
          fields: Array.isArray(objectRecord.fields) ? objectRecord.fields : [],
        }
      }),
    } satisfies TemplateSnapshot
  }

  private getFallbackTemplatesForOrganization(organizationId: string) {
    return Array.from(fallbackWorkflowTemplates.values())
      .filter((template) => template.organization_id === organizationId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
  }

  async seedDefaultsForOrganization(organizationId: string, createdBy: string | null) {
    const now = new Date().toISOString()

    try {
      const { data: existingTemplates, error: existingError } = await this.databaseService.supabase
        .from('workflow_templates')
        .select('name')
        .eq('organization_id', organizationId)

      if (existingError) {
        throw existingError
      }

      const existingNames = new Set((existingTemplates ?? []).map((template) => String(template.name)))
      const missingTemplates = defaultWorkflowTemplates.filter((template) => !existingNames.has(template.name))

      if (missingTemplates.length === 0) {
        return
      }

      const { error } = await this.databaseService.supabase.from('workflow_templates').insert(
        missingTemplates.map((template) => ({
          id: randomUUID(),
          organization_id: organizationId,
          name: template.name,
          description: template.description,
          category: template.category,
          source_workspace_id: null,
          is_system: true,
          snapshot: template.snapshot,
          created_by: createdBy,
          created_at: now,
        })),
      )

      if (error) {
        throw error
      }
    } catch (error) {
      if (!isMissingTemplateSchema(error) && !isMissingTemplateConstraint(error)) {
        throw error
      }

      for (const template of defaultWorkflowTemplates) {
        const alreadyExists = this.getFallbackTemplatesForOrganization(organizationId).some(
          (entry) => entry.name === template.name,
        )
        if (alreadyExists) {
          continue
        }

        const id = randomUUID()
        fallbackWorkflowTemplates.set(id, {
          id,
          organization_id: organizationId,
          name: template.name,
          description: template.description,
          category: template.category,
          source_workspace_id: null,
          is_system: true,
          snapshot: template.snapshot,
          created_by: createdBy,
          created_at: now,
        })
      }
    }
  }

  async list(userId: string, organizationId: string) {
    await this.databaseService.assertOrganizationAccess(organizationId, userId)

    try {
      const { data, error } = await this.databaseService.supabase
        .from('workflow_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return data ?? []
    } catch (error) {
      if (!isMissingTemplateSchema(error)) {
        throw error
      }

      await this.seedDefaultsForOrganization(organizationId, null)
      return this.getFallbackTemplatesForOrganization(organizationId)
    }
  }

  private async buildSnapshot(workspaceId: string) {
    const { data: workspaces, error: workspaceError } = await this.databaseService.supabase
      .from('workspaces')
      .select('*')
      .or(`id.eq.${workspaceId},parent_workspace_id.eq.${workspaceId}`)

    if (workspaceError) {
      throw workspaceError
    }

    const allWorkspaces = [...(workspaces ?? [])]
    const seen = new Set(allWorkspaces.map((workspace) => workspace.id as string))
    let changed = true
    while (changed) {
      changed = false
      const candidateParents = [...seen]
      if (candidateParents.length === 0) {
        break
      }
      const { data: descendants, error } = await this.databaseService.supabase
        .from('workspaces')
        .select('*')
        .in('parent_workspace_id', candidateParents)
      if (error) {
        throw error
      }
      for (const workspace of descendants ?? []) {
        if (!seen.has(workspace.id as string)) {
          seen.add(workspace.id as string)
          allWorkspaces.push(workspace)
          changed = true
        }
      }
    }

    const workspaceIds = allWorkspaces.map((workspace) => workspace.id as string)
    const { data: activities, error: activityError } = await this.databaseService.supabase
      .from('activities')
      .select('*')
      .in('workspace_id', workspaceIds)
    if (activityError) {
      throw activityError
    }

    const { data: edges, error: edgeError } = await this.databaseService.supabase
      .from('canvas_edges')
      .select('*')
      .in('workspace_id', workspaceIds)
    if (edgeError) {
      throw edgeError
    }

    const { data: canvasObjects, error: objectError } = await this.databaseService.supabase
      .from('canvas_objects')
      .select('*, object_fields(*)')
      .in('workspace_id', workspaceIds)
    if (objectError) {
      throw objectError
    }

    const root = allWorkspaces.find((workspace) => workspace.id === workspaceId)
    if (!root) {
      throw new Error('Workspace for template snapshot not found')
    }

    const workspaceTempIds = new Map<string, string>()
    const activityTempIds = new Map<string, string>()
    const edgeTempIds = new Map<string, string>()
    const objectTempIds = new Map<string, string>()

    for (const workspace of allWorkspaces) workspaceTempIds.set(workspace.id as string, randomUUID())
    for (const activity of activities ?? []) activityTempIds.set(activity.id as string, randomUUID())
    for (const edge of edges ?? []) edgeTempIds.set(edge.id as string, randomUUID())
    for (const object of canvasObjects ?? []) objectTempIds.set(object.id as string, randomUUID())

    return {
      rootWorkspace: {
        name: root.name as string,
        purpose: (root.purpose as string | null) ?? null,
        expected_inputs: (root.expected_inputs as string[]) ?? [],
        expected_outputs: (root.expected_outputs as string[]) ?? [],
      },
      workspaces: allWorkspaces
        .filter((workspace) => workspace.id !== workspaceId)
        .map((workspace) => ({
          tempId: workspaceTempIds.get(workspace.id as string)!,
          parentWorkspaceTempId:
            workspace.parent_workspace_id === workspaceId
              ? null
              : workspace.parent_workspace_id
                ? workspaceTempIds.get(workspace.parent_workspace_id as string) ?? null
                : null,
          parentActivityTempId: workspace.parent_activity_id
            ? activityTempIds.get(workspace.parent_activity_id as string) ?? null
            : null,
          name: workspace.name as string,
          workflow_scope: (workspace.workflow_scope as 'standalone' | 'detail') ?? 'detail',
          purpose: (workspace.purpose as string | null) ?? null,
          expected_inputs: (workspace.expected_inputs as string[]) ?? [],
          expected_outputs: (workspace.expected_outputs as string[]) ?? [],
        })),
      activities: (activities ?? []).map((activity) => ({
        tempId: activityTempIds.get(activity.id as string)!,
        workspaceTempId:
          activity.workspace_id === workspaceId
            ? 'root'
            : workspaceTempIds.get(activity.workspace_id as string)!,
        parentTempId: activity.parent_id ? activityTempIds.get(activity.parent_id as string) ?? null : null,
        linkedWorkflowTempId: activity.linked_workflow_id
          ? activity.linked_workflow_id === workspaceId
            ? 'root'
            : workspaceTempIds.get(activity.linked_workflow_id as string) ?? null
          : null,
        node_type: activity.node_type,
        label: activity.label,
        trigger_type: activity.trigger_type,
        position_x: activity.position_x,
        position_y: activity.position_y,
        status: activity.status,
        status_icon: activity.status_icon,
        activity_type: activity.activity_type,
        description: activity.description,
        notes: activity.notes,
        duration_minutes: activity.duration_minutes,
        linked_workflow_mode: activity.linked_workflow_mode,
        linked_workflow_purpose: activity.linked_workflow_purpose,
        linked_workflow_inputs: activity.linked_workflow_inputs ?? [],
        linked_workflow_outputs: activity.linked_workflow_outputs ?? [],
      })),
      edges: (edges ?? []).map((edge) => ({
        tempId: edgeTempIds.get(edge.id as string)!,
        workspaceTempId:
          edge.workspace_id === workspaceId ? 'root' : workspaceTempIds.get(edge.workspace_id as string)!,
        parentActivityTempId: edge.parent_activity_id
          ? activityTempIds.get(edge.parent_activity_id as string) ?? null
          : null,
        from_node_type: edge.from_node_type,
        from_node_temp_id: activityTempIds.get(edge.from_node_id as string) ?? objectTempIds.get(edge.from_node_id as string),
        from_handle_id: edge.from_handle_id,
        to_node_type: edge.to_node_type,
        to_node_temp_id: activityTempIds.get(edge.to_node_id as string) ?? objectTempIds.get(edge.to_node_id as string),
        to_handle_id: edge.to_handle_id,
        label: edge.label,
        transport_mode_id: null,
        notes: edge.notes,
      })),
      canvasObjects: (canvasObjects ?? []).map((canvasObject) => ({
        tempId: objectTempIds.get(canvasObject.id as string)!,
        workspaceTempId:
          canvasObject.workspace_id === workspaceId
            ? 'root'
            : workspaceTempIds.get(canvasObject.workspace_id as string)!,
        parentActivityTempId: canvasObject.parent_activity_id
          ? activityTempIds.get(canvasObject.parent_activity_id as string) ?? null
          : null,
        object_type: canvasObject.object_type,
        name: canvasObject.name,
        edgeTempId: canvasObject.edge_id ? edgeTempIds.get(canvasObject.edge_id as string) ?? null : null,
        edge_sort_order: canvasObject.edge_sort_order ?? null,
        position_x: canvasObject.position_x ?? null,
        position_y: canvasObject.position_y ?? null,
        fields: ((canvasObject.object_fields as Array<Record<string, unknown>> | undefined) ?? []).map((field) => ({
          name: field.name,
          field_type: field.field_type,
          required: field.required,
          sort_order: field.sort_order,
        })),
      })),
    } satisfies TemplateSnapshot
  }

  async create(userId: string, input: { organization_id: string; source_workspace_id: string; name: string; description?: string | null }) {
    await this.databaseService.assertOrganizationAccess(input.organization_id, userId)
    await this.databaseService.assertWorkspaceAccess(input.source_workspace_id, userId)

    const snapshot = await this.buildSnapshot(input.source_workspace_id)
    const payload = {
      id: randomUUID(),
      organization_id: input.organization_id,
      source_workspace_id: input.source_workspace_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: null,
      is_system: false,
      snapshot,
      created_by: userId,
      created_at: new Date().toISOString(),
    }

    try {
      const { data, error } = await this.databaseService.supabase
        .from('workflow_templates')
        .insert(payload)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      if (!isMissingTemplateSchema(error)) {
        throw error
      }

      fallbackWorkflowTemplates.set(payload.id, payload)
      return payload
    }
  }

  async update(
    userId: string,
    templateId: string,
    input: { organization_id: string; name?: string; description?: string | null },
  ) {
    await this.databaseService.assertOrganizationAccess(input.organization_id, userId)
    const template = await this.getTemplate(userId, input.organization_id, templateId)

    if (template.is_system) {
      throw new BadRequestException('Systemvorlagen koennen nicht bearbeitet werden.')
    }

    const payload = {
      name: input.name?.trim() || template.name,
      description: input.description !== undefined ? input.description?.trim() || null : template.description,
    }

    try {
      const { data, error } = await this.databaseService.supabase
        .from('workflow_templates')
        .update(payload)
        .eq('id', templateId)
        .eq('organization_id', input.organization_id)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      if (!isMissingTemplateSchema(error)) {
        throw error
      }

      const fallbackTemplate = fallbackWorkflowTemplates.get(templateId)
      if (!fallbackTemplate || fallbackTemplate.organization_id !== input.organization_id) {
        throw error
      }

      const updatedTemplate = {
        ...fallbackTemplate,
        ...payload,
      }
      fallbackWorkflowTemplates.set(templateId, updatedTemplate)
      return updatedTemplate
    }
  }

  async remove(userId: string, templateId: string, organizationId: string) {
    await this.databaseService.assertOrganizationAccess(organizationId, userId)
    const template = await this.getTemplate(userId, organizationId, templateId)

    if (template.is_system) {
      throw new BadRequestException('Systemvorlagen koennen nicht geloescht werden.')
    }

    try {
      const { error } = await this.databaseService.supabase
        .from('workflow_templates')
        .delete()
        .eq('id', templateId)
        .eq('organization_id', organizationId)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      if (!isMissingTemplateSchema(error)) {
        throw error
      }

      fallbackWorkflowTemplates.delete(templateId)
      return { success: true }
    }
  }

  async instantiate(userId: string, templateId: string, input: { organization_id: string; name: string }) {
    const organization = await this.databaseService.assertOrganizationAccess(input.organization_id, userId)
    void organization
    const template = await this.getTemplate(userId, input.organization_id, templateId)
    const snapshot = this.normalizeSnapshot(template.snapshot as Record<string, unknown>)
    const now = new Date().toISOString()

    const workspaceIdMap = new Map<string, string>([['root', randomUUID()]])
    const activityIdMap = new Map<string, string>()
    const edgeIdMap = new Map<string, string>()
    const objectIdMap = new Map<string, string>()

    for (const workspace of snapshot.workspaces ?? []) workspaceIdMap.set(String(workspace.tempId), randomUUID())
    for (const activity of snapshot.activities ?? []) activityIdMap.set(String(activity.tempId), randomUUID())
    for (const edge of snapshot.edges ?? []) edgeIdMap.set(String(edge.tempId), randomUUID())
    for (const canvasObject of snapshot.canvasObjects ?? []) objectIdMap.set(String(canvasObject.tempId), randomUUID())

    const rootWorkspaceId = workspaceIdMap.get('root')!

    const workspacesToInsert = [
      {
        id: rootWorkspaceId,
        organization_id: input.organization_id,
        created_by: userId,
        name: input.name.trim(),
        parent_workspace_id: null,
        parent_activity_id: null,
        workflow_scope: 'standalone',
        purpose: snapshot.rootWorkspace?.purpose ?? null,
        expected_inputs: snapshot.rootWorkspace?.expected_inputs ?? [],
        expected_outputs: snapshot.rootWorkspace?.expected_outputs ?? [],
      },
      ...(snapshot.workspaces ?? []).map((workspace) => ({
        id: workspaceIdMap.get(String(workspace.tempId))!,
        organization_id: input.organization_id,
        created_by: userId,
        name: String(workspace.name),
        parent_workspace_id: workspace.parentWorkspaceTempId ? workspaceIdMap.get(String(workspace.parentWorkspaceTempId)) ?? rootWorkspaceId : rootWorkspaceId,
        parent_activity_id: workspace.parentActivityTempId ? activityIdMap.get(String(workspace.parentActivityTempId)) ?? null : null,
        workflow_scope: workspace.workflow_scope ?? 'detail',
        purpose: workspace.purpose ?? null,
        expected_inputs: (workspace.expected_inputs as string[]) ?? [],
        expected_outputs: (workspace.expected_outputs as string[]) ?? [],
      })),
    ]

    const activitiesToInsert = (snapshot.activities ?? []).map((activity) => ({
      id: activityIdMap.get(String(activity.tempId))!,
      workspace_id: workspaceIdMap.get(String(activity.workspaceTempId)) ?? rootWorkspaceId,
      owner_id: userId,
      assignee_user_id: null,
      parent_id: activity.parentTempId ? activityIdMap.get(String(activity.parentTempId)) ?? null : null,
      node_type: activity.node_type,
      label: activity.label,
      trigger_type: activity.trigger_type ?? null,
      position_x: activity.position_x,
      position_y: activity.position_y,
      status: activity.status ?? 'draft',
      status_icon: activity.status_icon ?? null,
      activity_type: activity.activity_type ?? null,
      description: activity.description ?? null,
      notes: activity.notes ?? null,
      duration_minutes: activity.duration_minutes ?? null,
      linked_workflow_id: activity.linkedWorkflowTempId ? workspaceIdMap.get(String(activity.linkedWorkflowTempId)) ?? null : null,
      linked_workflow_mode: activity.linked_workflow_mode ?? null,
      linked_workflow_purpose: activity.linked_workflow_purpose ?? null,
      linked_workflow_inputs: (activity.linked_workflow_inputs as string[]) ?? [],
      linked_workflow_outputs: (activity.linked_workflow_outputs as string[]) ?? [],
      updated_at: now,
    }))

    const edgesToInsert = (snapshot.edges ?? []).map((edge) => ({
      id: edgeIdMap.get(String(edge.tempId))!,
      workspace_id: workspaceIdMap.get(String(edge.workspaceTempId)) ?? rootWorkspaceId,
      parent_activity_id: edge.parentActivityTempId ? activityIdMap.get(String(edge.parentActivityTempId)) ?? null : null,
      from_node_type: edge.from_node_type,
      from_node_id:
        activityIdMap.get(String(edge.from_node_temp_id)) ??
        objectIdMap.get(String(edge.from_node_temp_id)) ??
        String(edge.from_node_temp_id),
      from_handle_id: edge.from_handle_id ?? null,
      to_node_type: edge.to_node_type,
      to_node_id:
        activityIdMap.get(String(edge.to_node_temp_id)) ??
        objectIdMap.get(String(edge.to_node_temp_id)) ??
        String(edge.to_node_temp_id),
      to_handle_id: edge.to_handle_id ?? null,
      label: edge.label ?? null,
      transport_mode_id: null,
      notes: edge.notes ?? null,
    }))

    const objectRows = (snapshot.canvasObjects ?? []).map((canvasObject) => ({
      id: objectIdMap.get(String(canvasObject.tempId))!,
      workspace_id: workspaceIdMap.get(String(canvasObject.workspaceTempId)) ?? rootWorkspaceId,
      parent_activity_id: canvasObject.parentActivityTempId ? activityIdMap.get(String(canvasObject.parentActivityTempId)) ?? null : null,
      object_type: canvasObject.object_type,
      name: canvasObject.name,
      edge_id: canvasObject.edgeTempId ? edgeIdMap.get(String(canvasObject.edgeTempId)) ?? null : null,
      edge_sort_order: canvasObject.edge_sort_order ?? null,
      position_x: canvasObject.position_x ?? null,
      position_y: canvasObject.position_y ?? null,
      fields: Array.isArray(canvasObject.fields) ? canvasObject.fields : [],
    }))
    const nodeObjectRows = objectRows.filter((canvasObject) => canvasObject.object_type === 'quelle')
    const edgeAttachedObjectRows = objectRows.filter((canvasObject) => canvasObject.object_type === 'datenobjekt')

    const insertCanvasObjects = async (rows: typeof objectRows) => {
      for (const objectRow of rows) {
        const { fields, ...canvasObjectPayload } = objectRow
        const { data, error } = await this.databaseService.supabase
          .from('canvas_objects')
          .insert(canvasObjectPayload)
          .select('*')
          .single()

        if (error) {
          throw error
        }

        if (Array.isArray(fields) && fields.length > 0) {
          const { error: fieldError } = await this.databaseService.supabase.from('object_fields').insert(
            fields.map((field, index) => ({
              id: randomUUID(),
              object_id: data.id,
              name: field.name,
              field_type: field.field_type,
              required: field.required,
              sort_order: field.sort_order ?? index,
            })),
          )

          if (fieldError) {
            throw fieldError
          }
        }
      }
    }

    const { error: workspaceError } = await this.databaseService.supabase.from('workspaces').insert(workspacesToInsert)
    if (workspaceError) {
      throw workspaceError
    }

    const { error: activityError } = await this.databaseService.supabase.from('activities').insert(activitiesToInsert)
    if (activityError) {
      throw activityError
    }

    await insertCanvasObjects(nodeObjectRows)

    const { error: edgeError } = await this.databaseService.supabase.from('canvas_edges').insert(edgesToInsert)
    if (edgeError) {
      throw edgeError
    }

    await insertCanvasObjects(edgeAttachedObjectRows)

    const { data: createdWorkspace, error: createdWorkspaceError } = await this.databaseService.supabase
      .from('workspaces')
      .select('*')
      .eq('id', rootWorkspaceId)
      .single()

    if (createdWorkspaceError) {
      throw createdWorkspaceError
    }

    return createdWorkspace
  }

  private async getTemplate(userId: string, organizationId: string, templateId: string) {
    await this.databaseService.assertOrganizationAccess(organizationId, userId)

    try {
      const { data, error } = await this.databaseService.supabase
        .from('workflow_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', templateId)
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      if (!isMissingTemplateSchema(error)) {
        throw error
      }

      const template = fallbackWorkflowTemplates.get(templateId)
      if (!template || template.organization_id !== organizationId) {
        throw error
      }
      return template
    }
  }
}
