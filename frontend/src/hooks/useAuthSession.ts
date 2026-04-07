import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      if (!supabase) {
        setIsLoading(false)
        return
      }
      const { data } = await supabase.auth.getSession()
      if (mounted) {
        setSession(data.session)
        setIsLoading(false)
      }
    }

    load()

    if (!supabase) {
      return
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession)
        setIsLoading(false)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { session, isLoading }
}
