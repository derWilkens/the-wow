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
    mutationFn: (input: { label: string; acronym?: string | null; description?: string | null }) =>
      apiRequest<CatalogRole>(`/organizations/${organizationId}/roles`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (createdRole) => {
      queryClient.setQueryData<CatalogRole[]>(['organizationRoles', organizationId], (current = []) => {
        const withoutDuplicate = current.filter((role) => role.id !== createdRole.id)
        return [...withoutDuplicate, createdRole].sort((left, right) => left.label.localeCompare(right.label, 'de'))
      })
      void queryClient.invalidateQueries({ queryKey: ['organizationRoles', organizationId] })
    },
  })
}

export function useUpdateOrganizationRole(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; label?: string; acronym?: string | null; description?: string | null }) =>
      apiRequest<CatalogRole>(`/organizations/${organizationId}/roles/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ label: input.label, acronym: input.acronym, description: input.description }),
      }),
    onSuccess: (updatedRole) => {
      queryClient.setQueryData<CatalogRole[]>(['organizationRoles', organizationId], (current = []) =>
        current
          .map((role) => (role.id === updatedRole.id ? updatedRole : role))
          .sort((left, right) => left.label.localeCompare(right.label, 'de')),
      )
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
    onSuccess: (_, roleId) => {
      queryClient.setQueryData<CatalogRole[]>(['organizationRoles', organizationId], (current = []) =>
        current.filter((role) => role.id !== roleId),
      )
      void queryClient.invalidateQueries({ queryKey: ['organizationRoles', organizationId] })
    },
  })
}
