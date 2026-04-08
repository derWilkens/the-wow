import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'
import type { CatalogRole } from '../types'

export function useOrganizationRoles(organizationId: string | null) {
  return useQuery({
    queryKey: ['organizationRoles', organizationId],
    enabled: Boolean(organizationId),
    queryFn: () => apiRequest<CatalogRole[]>(`/organizations/${organizationId}/roles`),
  })
}

export function useCreateOrganizationRole(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { label: string; description?: string | null }) =>
      apiRequest<CatalogRole>(`/organizations/${organizationId}/roles`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizationRoles', organizationId] })
    },
  })
}

export function useUpdateOrganizationRole(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; label?: string; description?: string | null }) =>
      apiRequest<CatalogRole>(`/organizations/${organizationId}/roles/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ label: input.label, description: input.description }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizationRoles', organizationId] })
    },
  })
}

export function useDeleteOrganizationRole(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) =>
      apiRequest<{ success: true }>(`/organizations/${organizationId}/roles/${roleId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizationRoles', organizationId] })
    },
  })
}
