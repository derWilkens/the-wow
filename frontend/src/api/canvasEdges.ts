import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'
import type { CanvasEdge, UpsertCanvasEdgeInput } from '../types'

function buildCanvasEdgesPath(workspaceId: string, parentActivityId: string | null) {
  const params = new URLSearchParams()
  if (parentActivityId) {
    params.set('parentActivityId', parentActivityId)
  }
  const query = params.toString()
  return `/workspaces/${workspaceId}/canvas-edges${query ? `?${query}` : ''}`
}

export function useCanvasEdges(workspaceId: string | null, parentActivityId: string | null) {
  return useQuery({
    queryKey: ['canvasEdges', workspaceId, parentActivityId],
    enabled: Boolean(workspaceId),
    queryFn: () => apiRequest<CanvasEdge[]>(buildCanvasEdgesPath(workspaceId!, parentActivityId)),
  })
}

export function useUpsertCanvasEdge(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertCanvasEdgeInput) => apiRequest<CanvasEdge>(`/workspaces/${workspaceId}/canvas-edges/upsert`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['canvasEdges', workspaceId] })
    },
  })
}

export function useDeleteCanvasEdge(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ success: true }>(`/workspaces/${workspaceId}/canvas-edges/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['canvasEdges', workspaceId] })
    },
  })
}
