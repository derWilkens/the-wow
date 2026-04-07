import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

export interface AuthenticatedUser {
  id: string
  email?: string
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers.authorization as string | undefined

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const token = authHeader.slice('Bearer '.length)
    const { data, error } = await this.databaseService.supabase.auth.getUser(token)

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid bearer token')
    }

    request.user = {
      id: data.user.id,
      email: data.user.email,
    }

    return true
  }
}
