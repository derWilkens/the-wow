import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'
import type { WorkflowTemplate, Workspace } from '../types'

export function useWorkflowTemplates(organizationId: string | null) {
  return useQuery({
    queryKey: ['workflowTemplates', organizationId],
    enabled: Boolean(organizationId),
    queryFn: () => apiRequest<WorkflowTemplate[]>(`/workflow-templates?organizationId=${organizationId}`),
  })
}

export function useCreateWorkflowTemplate(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { source_workspace_id: string; name: string; description?: string | null }) =>
      apiRequest<WorkflowTemplate>('/workflow-templates', {
        method: 'POST',
        body: JSON.stringify({
          organization_id: organizationId,
          ...input,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workflowTemplates', organizationId] })
    },
  })
}

export function useCreateWorkspaceFromTemplate(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { template_id: string; name: string }) =>
      apiRequest<Workspace>(`/workflow-templates/${input.template_id}/instantiate`, {
        method: 'POST',
        body: JSON.stringify({
          organization_id: organizationId,
          name: input.name,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['workflowTemplates', organizationId] })
    },
  })
}

export function useUpdateWorkflowTemplate(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { template_id: string; name: string; description?: string | null }) =>
      apiRequest<WorkflowTemplate>(`/workflow-templates/${input.template_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          organization_id: organizationId,
          name: input.name,
          description: input.description,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workflowTemplates', organizationId] })
    },
  })
}

export function useDeleteWorkflowTemplate(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) =>
      apiRequest<{ success: true }>(`/workflow-templates/${templateId}?organizationId=${organizationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workflowTemplates', organizationId] })
    },
  })
}
