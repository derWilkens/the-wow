import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'
import type {
  Activity,
  ActivityComment,
  CreateSubprocessInput,
  LinkSubprocessInput,
  UpsertActivityInput,
  Workspace,
} from '../types'

function buildActivitiesPath(workspaceId: string, parentId: string | null) {
  const params = new URLSearchParams()
  if (parentId) {
    params.set('parentId', parentId)
  }
  const query = params.toString()
  return `/workspaces/${workspaceId}/activities${query ? `?${query}` : ''}`
}

export function useActivities(workspaceId: string | null, parentId: string | null) {
  return useQuery({
    queryKey: ['activities', workspaceId, parentId],
    enabled: Boolean(workspaceId),
    queryFn: () => apiRequest<Activity[]>(buildActivitiesPath(workspaceId!, parentId)),
  })
}

export function useUpsertActivity(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertActivityInput) => apiRequest<Activity>(`/workspaces/${workspaceId}/activities/upsert`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activities', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['canvasEdges', workspaceId] })
    },
  })
}

export function useDeleteActivity(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ success: true }>(`/workspaces/${workspaceId}/activities/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activities', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['canvasEdges', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['activityTools', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['checkSources', workspaceId] })
    },
  })
}

export function useCreateSubprocess(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, input }: { activityId: string; input: CreateSubprocessInput }) =>
      apiRequest<{ workspace: Workspace; activity: Activity }>(
        `/workspaces/${workspaceId}/activities/${activityId}/subprocess`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activities', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      void queryClient.invalidateQueries({ queryKey: ['canvasEdges', workspaceId] })
    },
  })
}

export function useLinkSubprocess(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, input }: { activityId: string; input: LinkSubprocessInput }) =>
      apiRequest<Activity>(`/workspaces/${workspaceId}/activities/${activityId}/subprocess-link`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activities', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUnlinkSubprocess(workspaceId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (activityId: string) =>
      apiRequest<Activity>(`/workspaces/${workspaceId}/activities/${activityId}/subprocess-link`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activities', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useActivityComments(workspaceId: string | null, activityId: string | null) {
  return useQuery({
    queryKey: ['activityComments', workspaceId, activityId],
    enabled: Boolean(workspaceId && activityId),
    queryFn: () => apiRequest<ActivityComment[]>(`/workspaces/${workspaceId}/activities/${activityId}/comments`),
  })
}

export function useCreateActivityComment(workspaceId: string | null, activityId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      apiRequest<ActivityComment>(`/workspaces/${workspaceId}/activities/${activityId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activityComments', workspaceId, activityId] })
    },
  })
}

export function useUpdateActivityComment(workspaceId: string | null, activityId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      apiRequest<ActivityComment>(`/workspaces/${workspaceId}/activities/${activityId}/comments/${commentId}`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activityComments', workspaceId, activityId] })
    },
  })
}

export function useDeleteActivityComment(workspaceId: string | null, activityId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) =>
      apiRequest<{ success: true }>(`/workspaces/${workspaceId}/activities/${activityId}/comments/${commentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activityComments', workspaceId, activityId] })
    },
  })
}

