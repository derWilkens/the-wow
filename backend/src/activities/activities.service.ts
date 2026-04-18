import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService } from '../database/database.service'
import { fallbackActivityAssignments, fallbackActivityComments, fallbackOrganizationRoles } from '../fallback-store'
import { AggregateActivitiesToSubprocessDto } from './dto/aggregate-activities-to-subprocess.dto'
import { CreateSubprocessDto } from './dto/create-subprocess.dto'
import { LinkSubprocessDto } from './dto/link-subprocess.dto'
import { UpsertActivityDto } from './dto/upsert-activity.dto'

@Injectable()
export class ActivitiesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private normalizeLockState<T extends { is_locked?: boolean | null }>(record: T) {
    return {
      ...record,
      is_locked: Boolean(record.is_locked),
    }
  }

  private uniqueTrimmed(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
  }

  private getAggregateLabel(activityCount: number) {
    return activityCount === 2 ? 'Aggregierter Teilprozess' : `Aggregierter Teilprozess (${activityCount})`
  }

  private isMissingAssignmentSchema(error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : ''
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : ''

    return (
      code === 'PGRST205' ||
      message.includes('assignee_label') ||
      message.includes('role_id') ||
      message.includes('organization_roles')
    )
  }

  private async ensureRoleBelongsToOrganization(organizationId: string, roleId: string) {
    try {
      const { data, error } = await this.databaseService.supabase
        .from('organization_roles')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('id', roleId)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        throw new BadRequestException('Die ausgewaehlte Rolle gehoert nicht zu dieser Firma.')
      }
    } catch (error) {
      if (!this.isMissingAssignmentSchema(error)) {
        throw error
      }

      const fallbackRole = fallbackOrganizationRoles.get(roleId)
      if (!fallbackRole || fallbackRole.organization_id !== organizationId) {
        throw new BadRequestException('Die ausgewaehlte Rolle gehoert nicht zu dieser Firma.')
      }
    }
  }

  private isMissingCommentsSchema(error: unknown) {
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : ''

    return message.includes('activity_comments')
  }

  private rethrowSubprocessSchemaError(error: unknown): never {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code ?? '') : ''
    const message = typeof error === 'object' && error !== null && 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''
    const schemaIsMissing =
      code === '42703' ||
      message.includes('parent_workspace_id') ||
      message.includes('parent_activity_id') ||
      message.includes('workflow_scope') ||
      message.includes('purpose') ||
      message.includes('linked_workflow_id') ||
      message.includes('linked_workflow_mode') ||
      message.includes('linked_workflow_purpose') ||
      message.includes('linked_workflow_inputs') ||
      message.includes('linked_workflow_outputs')

    if (schemaIsMissing) {
      throw new BadRequestException('Workflow hierarchy fields are not available yet. Apply migration 005_workflow_hierarchy.sql and retry.')
    }

    throw error
  }

  async list(userId: string, workspaceId: string, parentId: string | null) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    let query = this.databaseService.supabase
      .from('activities')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position_x', { ascending: true })

    query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null)

    const { data, error } = await query
    if (error) {
      throw error
    }
    return (data ?? []).map((activity) => ({
      ...this.normalizeLockState(activity),
      assignee_label:
        'assignee_label' in activity
          ? ((activity as { assignee_label?: string | null }).assignee_label ?? null)
          : (fallbackActivityAssignments.get(activity.id as string)?.assigneeLabel ?? null),
      role_id:
        'role_id' in activity
          ? ((activity as { role_id?: string | null }).role_id ?? null)
          : (fallbackActivityAssignments.get(activity.id as string)?.roleId ?? null),
    }))
  }

  async upsert(userId: string, workspaceId: string, dto: UpsertActivityDto) {
    const workspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    if (dto.role_id) {
      await this.ensureRoleBelongsToOrganization(workspace.organization_id, dto.role_id)
    }

    const payload = {
      id: dto.id ?? randomUUID(),
      workspace_id: workspaceId,
      owner_id: userId,
      parent_id: dto.parent_id ?? null,
      ...(dto.group_id !== undefined ? { group_id: dto.group_id ?? null } : {}),
      node_type: dto.node_type,
      label: dto.label,
      trigger_type: dto.trigger_type ?? null,
      position_x: dto.position_x,
      position_y: dto.position_y,
      status: dto.status ?? 'draft',
      status_icon: dto.status_icon ?? null,
      activity_type: dto.activity_type ?? 'unbestimmt',
      description: dto.description ?? null,
      notes: dto.notes ?? null,
      duration_minutes: dto.duration_minutes ?? null,
      ...(dto.linked_workflow_id !== undefined ? { linked_workflow_id: dto.linked_workflow_id ?? null } : {}),
      ...(dto.linked_workflow_mode !== undefined ? { linked_workflow_mode: dto.linked_workflow_mode ?? null } : {}),
      ...(dto.linked_workflow_purpose !== undefined ? { linked_workflow_purpose: dto.linked_workflow_purpose ?? null } : {}),
      ...(dto.linked_workflow_inputs !== undefined ? { linked_workflow_inputs: dto.linked_workflow_inputs } : {}),
      ...(dto.linked_workflow_outputs !== undefined ? { linked_workflow_outputs: dto.linked_workflow_outputs } : {}),
      ...(dto.assignee_label !== undefined
        ? { assignee_label: dto.assignee_label?.trim() ? dto.assignee_label.trim() : null }
        : {}),
      ...(dto.role_id !== undefined ? { role_id: dto.role_id ?? null } : {}),
      ...(dto.is_locked !== undefined ? { is_locked: dto.is_locked } : {}),
    }

    let data
    try {
      const result = await this.databaseService.supabase
        .from('activities')
        .upsert(payload)
        .select('*')
        .single()

      if (result.error) {
        throw result.error
      }

      fallbackActivityAssignments.delete(String(result.data.id))
      data = this.normalizeLockState(result.data)
    } catch (error) {
      if (!this.isMissingAssignmentSchema(error)) {
        throw error
      }

      const { assignee_label: assigneeLabel, role_id: roleId, ...fallbackPayload } = payload
      const result = await this.databaseService.supabase
        .from('activities')
        .upsert(fallbackPayload)
        .select('*')
        .single()

      if (result.error) {
        throw result.error
      }

      fallbackActivityAssignments.set(String(result.data.id), {
        activityId: String(result.data.id),
        assigneeLabel: (assigneeLabel as string | null) ?? null,
        roleId: (roleId as string | null) ?? null,
      })
      data = {
        ...result.data,
        activity_type:
          ((result.data as { activity_type?: UpsertActivityDto['activity_type'] }).activity_type ?? payload.activity_type) ??
          'unbestimmt',
        assignee_label: (assigneeLabel as string | null) ?? null,
        role_id: (roleId as string | null) ?? null,
        is_locked: Boolean((payload as { is_locked?: boolean }).is_locked),
      }
    }

    return data
  }

  async listComments(userId: string, workspaceId: string, activityId: string) {
    const workspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    try {
      const { data, error } = await this.databaseService.supabase
        .from('activity_comments')
        .select('*')
        .eq('activity_id', activityId)
        .eq('organization_id', workspace.organization_id)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return data ?? []
    } catch (error) {
      if (!this.isMissingCommentsSchema(error)) {
        throw error
      }

      return Array.from(fallbackActivityComments.values())
        .filter((comment) => comment.activity_id === activityId && comment.organization_id === workspace.organization_id)
        .sort((left, right) => left.created_at.localeCompare(right.created_at))
    }
  }

  async createComment(userId: string, workspaceId: string, activityId: string, body: string) {
    const workspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    const payload = {
      id: randomUUID(),
      activity_id: activityId,
      organization_id: workspace.organization_id,
      author_user_id: userId,
      body: body.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const { data, error } = await this.databaseService.supabase
        .from('activity_comments')
        .insert(payload)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      if (!this.isMissingCommentsSchema(error)) {
        throw error
      }

      fallbackActivityComments.set(payload.id, payload)
      return payload
    }
  }

  async updateComment(userId: string, workspaceId: string, activityId: string, commentId: string, body: string) {
    const workspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    try {
      const { data, error } = await this.databaseService.supabase
        .from('activity_comments')
        .update({ body: body.trim() })
        .eq('id', commentId)
        .eq('activity_id', activityId)
        .eq('organization_id', workspace.organization_id)
        .eq('author_user_id', userId)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      if (!this.isMissingCommentsSchema(error)) {
        throw error
      }

      const current = fallbackActivityComments.get(commentId)
      if (!current || current.author_user_id !== userId) {
        throw error
      }
      const updated = { ...current, body: body.trim(), updated_at: new Date().toISOString() }
      fallbackActivityComments.set(commentId, updated)
      return updated
    }
  }

  async removeComment(userId: string, workspaceId: string, activityId: string, commentId: string) {
    const workspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    try {
      const { error } = await this.databaseService.supabase
        .from('activity_comments')
        .delete()
        .eq('id', commentId)
        .eq('activity_id', activityId)
        .eq('organization_id', workspace.organization_id)
        .eq('author_user_id', userId)

      if (error) {
        throw error
      }
    } catch (error) {
      if (!this.isMissingCommentsSchema(error)) {
        throw error
      }
      fallbackActivityComments.delete(commentId)
    }

    return { success: true }
  }

  async aggregateToSubprocess(userId: string, workspaceId: string, dto: AggregateActivitiesToSubprocessDto) {
    try {
      const parentWorkspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
      const selectedActivityIds = Array.from(new Set(dto.activity_ids))

      const { data: selectedActivities, error: selectedActivitiesError } = await this.databaseService.supabase
        .from('activities')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('id', selectedActivityIds)

      if (selectedActivitiesError) {
        throw selectedActivitiesError
      }

      if ((selectedActivities ?? []).length !== selectedActivityIds.length) {
        throw new BadRequestException('Mindestens eine ausgewaehlte Aktivitaet wurde nicht gefunden.')
      }

      const aggregateCandidates = (selectedActivities ?? []).filter((activity) => activity.node_type === 'activity')
      if (aggregateCandidates.length !== selectedActivityIds.length) {
        throw new BadRequestException('Nur normale Aktivitaeten koennen zu einem Subprozess aggregiert werden.')
      }

      const { data: workspaceEdges, error: workspaceEdgesError } = await this.databaseService.supabase
        .from('canvas_edges')
        .select('*')
        .eq('workspace_id', workspaceId)

      if (workspaceEdgesError) {
        throw workspaceEdgesError
      }

      const selectedActivityIdSet = new Set(selectedActivityIds)
      const incomingEdges = (workspaceEdges ?? []).filter(
        (edge) => selectedActivityIdSet.has(edge.to_node_id) && !selectedActivityIdSet.has(edge.from_node_id),
      )
      const outgoingEdges = (workspaceEdges ?? []).filter(
        (edge) => selectedActivityIdSet.has(edge.from_node_id) && !selectedActivityIdSet.has(edge.to_node_id),
      )
      const internalEdges = (workspaceEdges ?? []).filter(
        (edge) => selectedActivityIdSet.has(edge.from_node_id) && selectedActivityIdSet.has(edge.to_node_id),
      )

      const relevantEdgeIds = Array.from(new Set([...incomingEdges, ...outgoingEdges, ...internalEdges].map((edge) => edge.id)))
      const { data: relevantDataObjects, error: relevantDataObjectsError } = relevantEdgeIds.length
        ? await this.databaseService.supabase
            .from('canvas_objects')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('object_type', 'datenobjekt')
            .in('edge_id', relevantEdgeIds)
        : { data: [], error: null }

      if (relevantDataObjectsError) {
        throw relevantDataObjectsError
      }

      const dataObjectsByEdgeId = new Map<string, Array<{ name: string }>>()
      for (const item of relevantDataObjects ?? []) {
        const edgeId = String(item.edge_id)
        const current = dataObjectsByEdgeId.get(edgeId) ?? []
        current.push({ name: String(item.name ?? '') })
        dataObjectsByEdgeId.set(edgeId, current)
      }

      const edgeSemanticLabels = (edgeId: string, fallbackLabel: string | null) => {
        const objectLabels = (dataObjectsByEdgeId.get(edgeId) ?? [])
          .map((item) => item.name.trim())
          .filter(Boolean)
        if (objectLabels.length > 0) {
          return objectLabels
        }

        return fallbackLabel?.trim() ? [fallbackLabel.trim()] : []
      }

      const expectedInputs = this.uniqueTrimmed(
        incomingEdges.flatMap((edge) => edgeSemanticLabels(String(edge.id), (edge.label as string | null) ?? null)),
      )
      const expectedOutputs = this.uniqueTrimmed(
        outgoingEdges.flatMap((edge) => edgeSemanticLabels(String(edge.id), (edge.label as string | null) ?? null)),
      )

      const xValues = aggregateCandidates.map((activity) => Number(activity.position_x))
      const yValues = aggregateCandidates.map((activity) => Number(activity.position_y))
      const minX = Math.min(...xValues)
      const minY = Math.min(...yValues)
      const maxX = Math.max(...xValues)
      const maxY = Math.max(...yValues)
      const aggregateActivityId = randomUUID()
      const childWorkspaceId = randomUUID()
      const aggregateLabel = this.getAggregateLabel(aggregateCandidates.length)
      const aggregatePosition = {
        x: minX + (maxX - minX) / 2,
        y: minY + (maxY - minY) / 2,
      }

      const { data: childWorkspace, error: childWorkspaceError } = await this.databaseService.supabase
        .from('workspaces')
        .insert({
          id: childWorkspaceId,
          name: aggregateLabel,
          created_by: userId,
          organization_id: parentWorkspace.organization_id,
          parent_workspace_id: workspaceId,
          parent_activity_id: null,
          workflow_scope: 'detail',
          purpose: null,
          expected_inputs: expectedInputs,
          expected_outputs: expectedOutputs,
        })
        .select('*')
        .single()

      if (childWorkspaceError) {
        throw childWorkspaceError
      }

      const { data: aggregateActivity, error: aggregateActivityError } = await this.databaseService.supabase
        .from('activities')
        .insert({
          id: aggregateActivityId,
          workspace_id: workspaceId,
          owner_id: userId,
          parent_id: null,
          node_type: 'activity',
          label: aggregateLabel,
          trigger_type: null,
          position_x: aggregatePosition.x,
          position_y: aggregatePosition.y,
          status: 'draft',
          status_icon: null,
          activity_type: 'unbestimmt',
          description: null,
          notes: null,
          duration_minutes: null,
          linked_workflow_id: childWorkspaceId,
          linked_workflow_mode: 'detail',
          linked_workflow_purpose: null,
          linked_workflow_inputs: expectedInputs,
          linked_workflow_outputs: expectedOutputs,
          is_locked: false,
        })
        .select('*')
        .single()

      if (aggregateActivityError) {
        throw aggregateActivityError
      }

      const { error: updateChildWorkspaceError } = await this.databaseService.supabase
        .from('workspaces')
        .update({ parent_activity_id: aggregateActivityId })
        .eq('id', childWorkspaceId)

      if (updateChildWorkspaceError) {
        throw updateChildWorkspaceError
      }

      const childActivityOffset = {
        x: 220 - minX,
        y: 140 - minY,
      }

      const { error: moveActivitiesError } = await this.databaseService.supabase.from('activities').upsert(
        aggregateCandidates.map((activity) => ({
          ...activity,
          workspace_id: childWorkspaceId,
          parent_id: null,
          position_x: Number(activity.position_x) + childActivityOffset.x,
          position_y: Number(activity.position_y) + childActivityOffset.y,
        })),
      )

      if (moveActivitiesError) {
        throw moveActivitiesError
      }

      const { error: moveInternalEdgesError } = internalEdges.length
        ? await this.databaseService.supabase.from('canvas_edges').upsert(
            internalEdges.map((edge) => ({
              ...edge,
              workspace_id: childWorkspaceId,
              parent_activity_id: null,
            })),
          )
        : { error: null }

      if (moveInternalEdgesError) {
        throw moveInternalEdgesError
      }

      const { error: moveInternalDataObjectsError } =
        internalEdges.length && (relevantDataObjects ?? []).some((item) => internalEdges.some((edge) => edge.id === item.edge_id))
          ? await this.databaseService.supabase.from('canvas_objects').upsert(
              (relevantDataObjects ?? [])
                .filter((item) => internalEdges.some((edge) => edge.id === item.edge_id))
                .map((item) => ({
                  ...item,
                  workspace_id: childWorkspaceId,
                })),
            )
          : { error: null }

      if (moveInternalDataObjectsError) {
        throw moveInternalDataObjectsError
      }

      const childStartId = randomUUID()
      const childEndId = randomUUID()
      const leftmostSelectedActivity = aggregateCandidates.reduce((left, right) =>
        Number(left.position_x) <= Number(right.position_x) ? left : right,
      )
      const rightmostSelectedActivity = aggregateCandidates.reduce((left, right) =>
        Number(left.position_x) >= Number(right.position_x) ? left : right,
      )
      const startAnchorY = Number(leftmostSelectedActivity.position_y) + childActivityOffset.y + 28
      const endAnchorY = Number(rightmostSelectedActivity.position_y) + childActivityOffset.y + 28
      const bridgeRightX = Math.max(
        ...aggregateCandidates.map((activity) => Number(activity.position_x) + childActivityOffset.x),
      ) + 280

      const { error: seedChildBoundaryActivitiesError } = await this.databaseService.supabase.from('activities').insert([
        {
          id: childStartId,
          workspace_id: childWorkspaceId,
          owner_id: userId,
          parent_id: null,
          node_type: 'start_event',
          label: 'Start',
          trigger_type: 'manual',
          position_x: 60,
          position_y: startAnchorY,
          status: 'draft',
          status_icon: null,
          activity_type: 'unbestimmt',
          description: null,
          notes: null,
          duration_minutes: null,
          linked_workflow_id: null,
          linked_workflow_mode: null,
          linked_workflow_purpose: null,
          linked_workflow_inputs: [],
          linked_workflow_outputs: [],
          is_locked: false,
        },
        {
          id: childEndId,
          workspace_id: childWorkspaceId,
          owner_id: userId,
          parent_id: null,
          node_type: 'end_event',
          label: 'Ende',
          trigger_type: null,
          position_x: bridgeRightX,
          position_y: endAnchorY,
          status: 'draft',
          status_icon: null,
          activity_type: 'unbestimmt',
          description: null,
          notes: null,
          duration_minutes: null,
          linked_workflow_id: null,
          linked_workflow_mode: null,
          linked_workflow_purpose: null,
          linked_workflow_inputs: [],
          linked_workflow_outputs: [],
          is_locked: false,
        },
      ])

      if (seedChildBoundaryActivitiesError) {
        throw seedChildBoundaryActivitiesError
      }

      const bridgeEdges = [
        ...incomingEdges.map((edge) => ({
          id: randomUUID(),
          workspace_id: childWorkspaceId,
          parent_activity_id: null,
          from_node_type: 'activity',
          from_node_id: childStartId,
          from_handle_id: 'source-right',
          to_node_type: 'activity',
          to_node_id: edge.to_node_id,
          to_handle_id: edge.to_handle_id,
          label: edge.label ?? null,
          transport_mode_id: ('transport_mode_id' in edge ? edge.transport_mode_id : null) ?? null,
          notes: ('notes' in edge ? edge.notes : null) ?? null,
        })),
        ...outgoingEdges.map((edge) => ({
          id: randomUUID(),
          workspace_id: childWorkspaceId,
          parent_activity_id: null,
          from_node_type: 'activity',
          from_node_id: edge.from_node_id,
          from_handle_id: edge.from_handle_id,
          to_node_type: 'activity',
          to_node_id: childEndId,
          to_handle_id: 'target-left',
          label: edge.label ?? null,
          transport_mode_id: ('transport_mode_id' in edge ? edge.transport_mode_id : null) ?? null,
          notes: ('notes' in edge ? edge.notes : null) ?? null,
        })),
      ]

      if (bridgeEdges.length > 0) {
        const { error: bridgeEdgesError } = await this.databaseService.supabase.from('canvas_edges').insert(bridgeEdges)
        if (bridgeEdgesError) {
          throw bridgeEdgesError
        }
      }

      const rewiredParentEdges = [
        ...incomingEdges.map((edge) => ({
          ...edge,
          to_node_type: 'activity',
          to_node_id: aggregateActivityId,
        })),
        ...outgoingEdges.map((edge) => ({
          ...edge,
          from_node_type: 'activity',
          from_node_id: aggregateActivityId,
        })),
      ]

      if (rewiredParentEdges.length > 0) {
        const { error: rewiredParentEdgesError } = await this.databaseService.supabase.from('canvas_edges').upsert(rewiredParentEdges)
        if (rewiredParentEdgesError) {
          throw rewiredParentEdgesError
        }
      }

      return {
        workspace: childWorkspace,
        activity: this.normalizeLockState(aggregateActivity),
      }
    } catch (error) {
      this.rethrowSubprocessSchemaError(error)
    }
  }

  async remove(userId: string, workspaceId: string, id: string) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
    const { error } = await this.databaseService.supabase.from('activities').delete().eq('id', id).eq('workspace_id', workspaceId)
    if (error) {
      throw error
    }
    fallbackActivityAssignments.delete(id)
    return { success: true }
  }

  async createSubprocess(userId: string, workspaceId: string, activityId: string, dto: CreateSubprocessDto) {
    try {
      const parentWorkspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

      const { data: activity, error: activityError } = await this.databaseService.supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .eq('workspace_id', workspaceId)
        .single()

      if (activityError) {
        throw activityError
      }

      const expectedInputs = dto.expected_inputs.filter(Boolean)
      const expectedOutputs = dto.expected_outputs.filter(Boolean)
      const steps = dto.steps.filter(Boolean)
      const subprocessWorkspaceId = randomUUID()

      const { data: subprocessWorkspace, error: workspaceError } = await this.databaseService.supabase
        .from('workspaces')
        .insert({
          id: subprocessWorkspaceId,
          name: dto.name.trim(),
          created_by: userId,
          organization_id: parentWorkspace.organization_id,
          parent_workspace_id: workspaceId,
          parent_activity_id: activityId,
          workflow_scope: 'detail',
          purpose: dto.goal,
          expected_inputs: expectedInputs,
          expected_outputs: expectedOutputs,
        })
        .select('*')
        .single()

      if (workspaceError) {
        throw workspaceError
      }

      const startId = randomUUID()
      const endId = randomUUID()
      const stepLabels = steps.length > 0 ? steps : ['Teilprozessschritt']
      const stepIds = stepLabels.map(() => randomUUID())

      const activitiesToInsert = [
        {
          id: startId,
          workspace_id: subprocessWorkspaceId,
          owner_id: userId,
          parent_id: null,
          node_type: 'start_event',
          label: 'Start',
          trigger_type: 'manual',
          position_x: 60,
          position_y: 240,
          status: 'draft',
          status_icon: null,
          activity_type: null,
          description: dto.goal,
          notes: null,
          duration_minutes: null,
          linked_workflow_id: null,
          linked_workflow_mode: null,
          linked_workflow_purpose: null,
          linked_workflow_inputs: [],
          linked_workflow_outputs: [],
        },
        ...stepLabels.map((label, index) => ({
          id: stepIds[index],
          workspace_id: subprocessWorkspaceId,
          owner_id: userId,
          parent_id: null,
          node_type: 'activity',
          label,
          trigger_type: null,
          position_x: 250 + index * 240,
          position_y: 210,
          status: 'draft',
          status_icon: null,
          activity_type: null,
          description: null,
          notes: null,
          duration_minutes: null,
          linked_workflow_id: null,
          linked_workflow_mode: null,
          linked_workflow_purpose: null,
          linked_workflow_inputs: [],
          linked_workflow_outputs: [],
        })),
        {
          id: endId,
          workspace_id: subprocessWorkspaceId,
          owner_id: userId,
          parent_id: null,
          node_type: 'end_event',
          label: 'Ende',
          trigger_type: null,
          position_x: 250 + stepLabels.length * 240,
          position_y: 240,
          status: 'draft',
          status_icon: null,
          activity_type: null,
          description: null,
          notes: null,
          duration_minutes: null,
          linked_workflow_id: null,
          linked_workflow_mode: null,
          linked_workflow_purpose: null,
          linked_workflow_inputs: [],
          linked_workflow_outputs: [],
        },
      ]

      const { error: seedActivitiesError } = await this.databaseService.supabase.from('activities').insert(activitiesToInsert)
      if (seedActivitiesError) {
        throw seedActivitiesError
      }

      const chainNodeIds = [startId, ...stepIds, endId]
      const edgesToInsert = chainNodeIds.slice(0, -1).map((fromNodeId, index) => ({
        id: randomUUID(),
        workspace_id: subprocessWorkspaceId,
        parent_activity_id: null,
        from_node_type: 'activity',
        from_node_id: fromNodeId,
        from_handle_id: 'source-right',
        to_node_type: 'activity',
        to_node_id: chainNodeIds[index + 1],
        to_handle_id: 'target-left',
        label: null,
      }))

      const { error: seedEdgesError } = await this.databaseService.supabase.from('canvas_edges').insert(edgesToInsert)
      if (seedEdgesError) {
        throw seedEdgesError
      }

      const { data: updatedActivity, error: updateActivityError } = await this.databaseService.supabase
        .from('activities')
        .update({
          linked_workflow_id: subprocessWorkspaceId,
          linked_workflow_mode: 'detail',
          linked_workflow_purpose: dto.goal,
          linked_workflow_inputs: expectedInputs,
          linked_workflow_outputs: expectedOutputs,
        })
        .eq('id', activityId)
        .eq('workspace_id', workspaceId)
        .select('*')
        .single()

      if (updateActivityError) {
        throw updateActivityError
      }

      return {
        workspace: subprocessWorkspace,
        activity: updatedActivity,
      }
    } catch (error) {
      this.rethrowSubprocessSchemaError(error)
    }
  }

  async linkSubprocess(userId: string, workspaceId: string, activityId: string, dto: LinkSubprocessDto) {
    try {
      await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
      await this.databaseService.assertWorkspaceAccess(dto.linked_workflow_id, userId)

      const { data, error } = await this.databaseService.supabase
        .from('activities')
        .update({
          linked_workflow_id: dto.linked_workflow_id,
          linked_workflow_mode: dto.linked_workflow_mode ?? 'reference',
          linked_workflow_purpose: dto.linked_workflow_purpose ?? null,
          linked_workflow_inputs: dto.linked_workflow_inputs ?? [],
          linked_workflow_outputs: dto.linked_workflow_outputs ?? [],
        })
        .eq('id', activityId)
        .eq('workspace_id', workspaceId)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      this.rethrowSubprocessSchemaError(error)
    }
  }

  async unlinkSubprocess(userId: string, workspaceId: string, activityId: string) {
    try {
      await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

      const { data, error } = await this.databaseService.supabase
        .from('activities')
        .update({
          linked_workflow_id: null,
          linked_workflow_mode: null,
          linked_workflow_purpose: null,
          linked_workflow_inputs: [],
          linked_workflow_outputs: [],
        })
        .eq('id', activityId)
        .eq('workspace_id', workspaceId)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      this.rethrowSubprocessSchemaError(error)
    }
  }
}
