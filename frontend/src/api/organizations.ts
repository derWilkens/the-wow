import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'
import type { Organization, OrganizationInvitation, OrganizationMember, OrganizationRole } from '../types'

export function useOrganizations(enabled = true) {
  return useQuery({
    queryKey: ['organizations'],
    enabled,
    queryFn: () => apiRequest<Organization[]>('/organizations'),
  })
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      apiRequest<Organization>('/organizations', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { organizationId: string; name: string }) =>
      apiRequest<Organization>(`/organizations/${input.organizationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: input.name }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

export function useOrganizationMembers(organizationId: string | null) {
  return useQuery({
    queryKey: ['organizationMembers', organizationId],
    enabled: Boolean(organizationId),
    queryFn: () => apiRequest<OrganizationMember[]>(`/organizations/${organizationId}/members`),
  })
}

export function useInviteOrganizationMember(organizationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; role?: Extract<OrganizationRole, 'admin' | 'member'> }) =>
      apiRequest(`/organizations/${organizationId}/invitations`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizationMembers', organizationId] })
    },
  })
}

export function usePendingOrganizationInvitations(enabled = true) {
  return useQuery({
    queryKey: ['pendingOrganizationInvitations'],
    enabled,
    queryFn: () => apiRequest<OrganizationInvitation[]>('/organization-invitations/pending'),
  })
}

export function useAcceptOrganizationInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiRequest<Organization>(`/organization-invitations/${invitationId}/accept`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      void queryClient.invalidateQueries({ queryKey: ['pendingOrganizationInvitations'] })
    },
  })
}
