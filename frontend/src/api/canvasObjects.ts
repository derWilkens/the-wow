import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'
import type { CanvasObject, UpsertCanvasObjectInput } from '../types'

function buildCanvasObjectsPath(workspaceId: string, parentActivityId: string | null) {
  const params = new URLSearchParams()
  if (parentActivityId) {
    params.set('parentActivityId', parentActivityId)
  }
  const query = params.toString()
  return `/workspaces/${workspaceId}/canvas-objects${query ? `?${query}` : ''}`
}

export function useCanvasObjects(workspaceId: string | null, parentActivityId: string | null) {
  return useQuery({
    queryKey: ['canvasObjects', workspaceId, parentActivityId],
    enabled: Boolean(workspaceId),
    queryFn: () => apiRequest<CanvasObject[]>(buildCanvasObjectsPath(workspaceId!, parentActivityId)),
  })
}

export function useUpsertCanvasObject(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertCanvasObjectInput) => apiRequest<CanvasObject>(`/workspaces/${workspaceId}/canvas-objects/upsert`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['canvasObjects', workspaceId] })
    },
  })
}

export function useDeleteCanvasObject(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ success: true }>(`/workspaces/${workspaceId}/canvas-objects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['canvasObjects', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['canvasEdges', workspaceId] })
    },
  })
}
