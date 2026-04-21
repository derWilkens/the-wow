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
      setError('Die Anmeldung ist noch nicht vollstaendig konfiguriert.')
      return
    }

    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const action = mode === 'signin' ? supabase.auth.signInWithPassword({ email, password }) : supabase.auth.signUp({ email, password })
      const { error: authError } = await action

      if (authError) {
        setError(authError.message)
      } else if (mode === 'signup') {
        setMessage('Konto angelegt. Falls E-Mail-Bestaetigung aktiv ist, bestaetige die Adresse vor der Anmeldung.')
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Die Anmeldung ist unerwartet fehlgeschlagen.')
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = Boolean(email.trim() && password)

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="wow-ui-card w-full max-w-md p-8 backdrop-blur-xl">
        <p className="wow-ui-eyebrow">Superpowers</p>
        <h1 className="wow-ui-title mt-3">Anmelden</h1>
        <p className="wow-ui-subtitle mt-2">Melde dich mit deinem Konto an, um auf Arbeitsablaeufe, Canvas und Live-Daten zuzugreifen.</p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!canSubmit || isLoading) {
              return
            }
            void handleSubmit('signin')
          }}
        >
          <div className="mt-6 space-y-4">
            <input data-testid="auth-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-Mail" className="wow-ui-input" />
            <input data-testid="auth-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Passwort" className="wow-ui-input" />
          </div>

          {error && <div className="mt-4 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {message && <div className="mt-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button data-testid="auth-signin" type="submit" disabled={isLoading || !canSubmit} className="wow-ui-button-primary disabled:opacity-60">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Anmelden
            </button>
            <button data-testid="auth-signup" type="button" onClick={() => void handleSubmit('signup')} disabled={isLoading || !canSubmit} className="wow-ui-button-secondary disabled:opacity-60">
              <UserPlus className="h-4 w-4" /> Registrieren
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
