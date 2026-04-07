import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'
import type { TransportModeOption } from '../types'

function buildTransportModesPath(organizationId: string) {
  return `/organizations/${organizationId}/transport-modes`
}

export function useTransportModes(organizationId: string | null) {
  return useQuery({
    queryKey: ['transportModes', organizationId],
    enabled: Boolean(organizationId),
    queryFn: () => apiRequest<TransportModeOption[]>(buildTransportModesPath(organizationId!)),
  })
}

export function useCreateTransportMode(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { label: string; description?: string | null; sort_order?: number; is_default?: boolean }) =>
      apiRequest<TransportModeOption>(buildTransportModesPath(organizationId!), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transportModes', organizationId] })
    },
  })
}

export function useUpdateTransportMode(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id: string
      label?: string
      description?: string | null
      sort_order?: number
      is_default?: boolean
    }) =>
      apiRequest<TransportModeOption>(`${buildTransportModesPath(organizationId!)}/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          label: input.label,
          description: input.description,
          sort_order: input.sort_order,
          is_default: input.is_default,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transportModes', organizationId] })
    },
  })
}

export function useDeactivateTransportMode(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (transportModeId: string) =>
      apiRequest<TransportModeOption>(`${buildTransportModesPath(organizationId!)}/${transportModeId}/deactivate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transportModes', organizationId] })
    },
  })
}
