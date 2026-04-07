import { useState } from 'react'
import { Loader2, LogIn, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(mode: 'signin' | 'signup') {
    if (!supabase) {
      setError('Die Anmeldung ist noch nicht vollständig konfiguriert.')
      return
    }

    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const action = mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })

      const { error: authError } = await action

      if (authError) {
        setError(authError.message)
      } else if (mode === 'signup') {
        setMessage('Konto angelegt. Falls E-Mail-Bestätigung aktiv ist, bestätige die Adresse vor der Anmeldung.')
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Die Anmeldung ist unerwartet fehlgeschlagen.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/80 p-8 shadow-[0_30px_100px_rgba(2,8,12,0.6)] backdrop-blur-xl">
        <p className="text-[11px] uppercase tracking-[0.36em] text-cyan-300/70">Superpowers</p>
        <h1 className="mt-3 font-display text-3xl text-white">Anmelden</h1>
        <p className="mt-2 text-sm text-slate-400">Melde dich mit deinem Konto an, um auf Arbeitsabläufe, Canvas und Live-Daten zuzugreifen.</p>

        <div className="mt-6 space-y-4">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-Mail" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Passwort" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none" />
        </div>

        {error && <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>}
        {message && <div className="mt-4 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">{message}</div>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={() => void handleSubmit('signin')} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Anmelden
          </button>
          <button onClick={() => void handleSubmit('signup')} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-60">
            <UserPlus className="h-4 w-4" /> Registrieren
          </button>
        </div>
      </div>
    </div>
  )
}
