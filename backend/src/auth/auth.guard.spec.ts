import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from './auth.guard'

describe('AuthGuard', () => {
  it('throws when the bearer token is missing', async () => {
    const guard = new AuthGuard({ supabase: { auth: { getUser: jest.fn() } } } as never)
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as unknown as ExecutionContext

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
  })

  it('accepts a valid token', async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'demo@example.com' } },
      error: null,
    })
    const guard = new AuthGuard({ supabase: { auth: { getUser } } } as never)
    const request: Record<string, unknown> = { headers: { authorization: 'Bearer token-123' } }
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(getUser).toHaveBeenCalledWith('token-123')
    expect(request.user).toEqual({ id: 'user-1', email: 'demo@example.com' })
  })
})
