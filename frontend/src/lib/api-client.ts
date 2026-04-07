import { supabase } from './supabase'

const runtimeConfig = window.__WOW_CONFIG__ ?? {}
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || runtimeConfig.apiBaseUrl || '').trim()

async function getAccessToken() {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new Error('Missing access token')
  }
  return token
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured')
  }
  const token = await getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
