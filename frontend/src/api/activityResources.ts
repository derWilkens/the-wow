import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'
import type { ActivityCheckSource, ITTool } from '../types'

export function useActivityTools(workspaceId: string | null, activityId: string | null) {
  return useQuery({
    queryKey: ['activityTools', workspaceId, activityId],
    enabled: Boolean(workspaceId && activityId),
    queryFn: () => apiRequest<ITTool[]>(`/workspaces/${workspaceId}/activities/${activityId}/tools`),
  })
}

export function useITTools(workspaceId: string | null) {
  return useQuery({
    queryKey: ['itTools', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => apiRequest<ITTool[]>(`/workspaces/${workspaceId}/it-tools`),
  })
}

export function useCreateITTool(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) =>
      apiRequest<ITTool>(`/workspaces/${workspaceId}/it-tools`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['itTools', workspaceId] })
    },
  })
}

export function useOrganizationITTools(organizationId: string | null) {
  return useQuery({
    queryKey: ['organizationItTools', organizationId],
    enabled: Boolean(organizationId),
    queryFn: () => apiRequest<ITTool[]>(`/organizations/${organizationId}/it-tools`),
  })
}

export function useCreateOrganizationITTool(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) =>
      apiRequest<ITTool>(`/organizations/${organizationId}/it-tools`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizationItTools', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['itTools'] })
    },
  })
}

export function useUpdateOrganizationITTool(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name: string; description?: string | null }) =>
      apiRequest<ITTool>(`/organizations/${organizationId}/it-tools/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: input.name, description: input.description }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizationItTools', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['itTools'] })
    },
  })
}

export function useDeleteOrganizationITTool(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (toolId: string) =>
      apiRequest<{ success: true }>(`/organizations/${organizationId}/it-tools/${toolId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizationItTools', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['itTools'] })
    },
  })
}

export function useLinkActivityTool(workspaceId: string | null, activityId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (toolId: string) =>
      apiRequest<ITTool>(`/workspaces/${workspaceId}/activities/${activityId}/tools`, {
        method: 'POST',
        body: JSON.stringify({ tool_id: toolId }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activityTools', workspaceId, activityId] })
      void queryClient.invalidateQueries({ queryKey: ['itTools', workspaceId] })
    },
  })
}

export function useUnlinkActivityTool(workspaceId: string | null, activityId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (toolId: string) => apiRequest<{ success: true }>(`/workspaces/${workspaceId}/activities/${activityId}/tools/${toolId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activityTools', workspaceId, activityId] })
    },
  })
}

export function useCheckSources(workspaceId: string | null, activityId: string | null) {
  return useQuery({
    queryKey: ['activityCheckSources', workspaceId, activityId],
    enabled: Boolean(workspaceId && activityId),
    queryFn: () => apiRequest<ActivityCheckSource[]>(`/workspaces/${workspaceId}/activities/${activityId}/check-sources`),
  })
}

export function useAddCheckSource(workspaceId: string | null, activityId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { canvas_object_id: string; notes?: string | null }) =>
      apiRequest<ActivityCheckSource>(`/workspaces/${workspaceId}/activities/${activityId}/check-sources`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activityCheckSources', workspaceId, activityId] })
    },
  })
}

export function useRemoveCheckSource(workspaceId: string | null, activityId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ success: true }>(`/workspaces/${workspaceId}/activities/${activityId}/check-sources/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activityCheckSources', workspaceId, activityId] })
    },
  })
}
