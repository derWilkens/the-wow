import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthenticatedUser } from './auth.guard'

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest()
  return request.user
})
