import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DatabaseService } from '../database/database.service'
import { fallbackActivityAssignees, fallbackActivityComments } from '../fallback-store'
import { CreateSubprocessDto } from './dto/create-subprocess.dto'
import { LinkSubprocessDto } from './dto/link-subprocess.dto'
import { UpsertActivityDto } from './dto/upsert-activity.dto'

@Injectable()
export class ActivitiesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private isMissingAssigneeSchema(error: unknown) {
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : ''

    return message.includes('assignee_user_id')
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
      ...activity,
      assignee_user_id: fallbackActivityAssignees.get(activity.id as string)?.assigneeUserId ?? (activity as { assignee_user_id?: string | null }).assignee_user_id ?? null,
    }))
  }

  async upsert(userId: string, workspaceId: string, dto: UpsertActivityDto) {
    const workspace = await this.databaseService.assertWorkspaceAccess(workspaceId, userId)

    if (dto.assignee_user_id) {
      await this.databaseService.assertOrganizationAccess(workspace.organization_id, dto.assignee_user_id)
    }

    const payload = {
      id: dto.id ?? randomUUID(),
      workspace_id: workspaceId,
      owner_id: userId,
      assignee_user_id: dto.assignee_user_id ?? null,
      parent_id: dto.parent_id ?? null,
      node_type: dto.node_type,
      label: dto.label,
      trigger_type: dto.trigger_type ?? null,
      position_x: dto.position_x,
      position_y: dto.position_y,
      status: dto.status ?? 'draft',
      status_icon: dto.status_icon ?? null,
      activity_type: dto.activity_type ?? null,
      description: dto.description ?? null,
      notes: dto.notes ?? null,
      duration_minutes: dto.duration_minutes ?? null,
      ...(dto.linked_workflow_id !== undefined ? { linked_workflow_id: dto.linked_workflow_id ?? null } : {}),
      ...(dto.linked_workflow_mode !== undefined ? { linked_workflow_mode: dto.linked_workflow_mode ?? null } : {}),
      ...(dto.linked_workflow_purpose !== undefined ? { linked_workflow_purpose: dto.linked_workflow_purpose ?? null } : {}),
      ...(dto.linked_workflow_inputs !== undefined ? { linked_workflow_inputs: dto.linked_workflow_inputs } : {}),
      ...(dto.linked_workflow_outputs !== undefined ? { linked_workflow_outputs: dto.linked_workflow_outputs } : {}),
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

      data = result.data
    } catch (error) {
      if (!this.isMissingAssigneeSchema(error)) {
        throw error
      }

      const { assignee_user_id: assigneeUserId, ...fallbackPayload } = payload
      const result = await this.databaseService.supabase
        .from('activities')
        .upsert(fallbackPayload)
        .select('*')
        .single()

      if (result.error) {
        throw result.error
      }

      fallbackActivityAssignees.set(String(result.data.id), {
        activityId: String(result.data.id),
        assigneeUserId: (assigneeUserId as string | null) ?? null,
      })
      data = {
        ...result.data,
        assignee_user_id: (assigneeUserId as string | null) ?? null,
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

  async remove(userId: string, workspaceId: string, id: string) {
    await this.databaseService.assertWorkspaceAccess(workspaceId, userId)
    const { error } = await this.databaseService.supabase.from('activities').delete().eq('id', id).eq('workspace_id', workspaceId)
    if (error) {
      throw error
    }
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
