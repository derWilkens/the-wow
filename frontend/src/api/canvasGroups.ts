import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'
import type { CanvasGroup, UpsertCanvasGroupInput } from '../types'

function buildCanvasGroupsPath(workspaceId: string, parentActivityId: string | null) {
  const params = new URLSearchParams()
  if (parentActivityId) {
    params.set('parentActivityId', parentActivityId)
  }
  const query = params.toString()
  return `/workspaces/${workspaceId}/canvas-groups${query ? `?${query}` : ''}`
}

export function useCanvasGroups(workspaceId: string | null, parentActivityId: string | null) {
  return useQuery({
    queryKey: ['canvasGroups', workspaceId, parentActivityId],
    enabled: Boolean(workspaceId),
    queryFn: () => apiRequest<CanvasGroup[]>(buildCanvasGroupsPath(workspaceId!, parentActivityId)),
  })
}

export function useUpsertCanvasGroup(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertCanvasGroupInput) =>
      apiRequest<CanvasGroup>(`/workspaces/${workspaceId}/canvas-groups/upsert`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['canvasGroups', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['activities', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['canvasObjects', workspaceId] })
    },
  })
}

export function useDeleteCanvasGroup(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ success: true }>(`/workspaces/${workspaceId}/canvas-groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['canvasGroups', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['activities', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['canvasObjects', workspaceId] })
    },
  })
}
