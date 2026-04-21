import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../lib/api-client'

export interface UserPreferenceRecord<T> {
  key: string
  value: T
  updated_at: string
}

export function useUserPreference<T>(key: string, enabled = true) {
  return useQuery({
    queryKey: ['userPreference', key],
    enabled,
    queryFn: () => apiRequest<UserPreferenceRecord<T> | null>(`/user-preferences/${encodeURIComponent(key)}`),
  })
}

export function useUpsertUserPreference<T>(key: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (value: T) =>
      apiRequest<UserPreferenceRecord<T>>(`/user-preferences/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ preference_value: value }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['userPreference', key] })
    },
  })
}
