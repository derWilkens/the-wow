import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthScreen } from './AuthScreen'

const signInWithPassword = vi.fn()
const signUp = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signUp: (...args: unknown[]) => signUp(...args),
    },
  },
}))

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInWithPassword.mockResolvedValue({ error: null })
    signUp.mockResolvedValue({ error: null })
  })

  it('submits sign-in on Enter when the form is valid', async () => {
    render(<AuthScreen />)

    fireEvent.change(screen.getByTestId('auth-email'), { target: { value: '2@derwilkens.de' } })
    fireEvent.change(screen.getByTestId('auth-password'), { target: { value: 'Wilkens:)' } })
    fireEvent.submit(screen.getByTestId('auth-signin').closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: '2@derwilkens.de',
        password: 'Wilkens:)',
      })
    })
  })

  it('keeps sign-in disabled until email and password are present', () => {
    render(<AuthScreen />)
    expect(screen.getByTestId('auth-signin')).toBeDisabled()

    fireEvent.change(screen.getByTestId('auth-email'), { target: { value: '2@derwilkens.de' } })
    expect(screen.getByTestId('auth-signin')).toBeDisabled()

    fireEvent.change(screen.getByTestId('auth-password'), { target: { value: 'Wilkens:)' } })
    expect(screen.getByTestId('auth-signin')).not.toBeDisabled()
  })
})
