import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'
import type { CreateWorkspaceInput, Workspace } from '../types'

export function useWorkspaces(organizationId: string | null) {
  return useQuery({
    queryKey: ['workspaces', organizationId],
    enabled: Boolean(organizationId),
    queryFn: () => apiRequest<Workspace[]>(`/workspaces?organizationId=${organizationId}`),
  })
}

export function useCreateWorkspace(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: string | CreateWorkspaceInput) =>
      apiRequest<Workspace>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(
          typeof input === 'string'
            ? { name: input, organization_id: organizationId }
            : { ...input, organization_id: input.organization_id ?? organizationId },
        ),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces', organizationId] })
    },
  })
}

export function useDeleteWorkspace(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workspaceId: string) => apiRequest<{ success: true }>(`/workspaces/${workspaceId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces', organizationId] })
    },
  })
}

export function useUpdateWorkspace(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      workspaceId: string
      name: string
      purpose?: string | null
      expected_inputs?: string[]
      expected_outputs?: string[]
    }) =>
      apiRequest<Workspace>(`/workspaces/${input.workspaceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: input.name,
          purpose: input.purpose,
          expected_inputs: input.expected_inputs,
          expected_outputs: input.expected_outputs,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces', organizationId] })
    },
  })
}
