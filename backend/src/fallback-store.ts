type ActivityAssigneeRecord = {
  activityId: string
  assigneeUserId: string | null
}

type ActivityCommentRecord = {
  id: string
  activity_id: string
  organization_id: string
  author_user_id: string | null
  body: string
  created_at: string
  updated_at: string
}

type WorkflowTemplateRecord = {
  id: string
  organization_id: string
  name: string
  description: string | null
  category: string | null
  source_workspace_id: string | null
  is_system: boolean
  snapshot: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export const fallbackActivityAssignees = new Map<string, ActivityAssigneeRecord>()
export const fallbackActivityComments = new Map<string, ActivityCommentRecord>()
export const fallbackWorkflowTemplates = new Map<string, WorkflowTemplateRecord>()
