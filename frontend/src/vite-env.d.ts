/// <reference types="vite/client" />

interface Window {
  __WOW_CONFIG__?: {
    apiBaseUrl?: string
    supabaseUrl?: string
    supabaseAnonKey?: string
  }
}
