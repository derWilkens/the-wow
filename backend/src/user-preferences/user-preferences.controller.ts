import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { UpsertUserPreferenceDto } from './dto/upsert-user-preference.dto'
import { UserPreferencesService } from './user-preferences.service'

@Controller('user-preferences')
@UseGuards(AuthGuard)
export class UserPreferencesController {
  constructor(private readonly userPreferencesService: UserPreferencesService) {}

  @Get(':key')
  get(@CurrentUser() user: AuthenticatedUser, @Param('key') key: string) {
    return this.userPreferencesService.get(user.id, key)
  }

  @Put(':key')
  upsert(@CurrentUser() user: AuthenticatedUser, @Param('key') key: string, @Body() dto: UpsertUserPreferenceDto) {
    return this.userPreferencesService.upsert(user.id, key, dto.preference_value)
  }
}
