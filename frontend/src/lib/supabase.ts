import { createClient } from '@supabase/supabase-js'

const runtimeConfig = window.__WOW_CONFIG__ ?? {}
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || runtimeConfig.supabaseUrl || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || runtimeConfig.supabaseAnonKey || ''

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
