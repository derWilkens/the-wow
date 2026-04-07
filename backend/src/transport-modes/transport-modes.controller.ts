import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { CreateTransportModeDto } from './dto/create-transport-mode.dto'
import { UpdateTransportModeDto } from './dto/update-transport-mode.dto'
import { TransportModesService } from './transport-modes.service'

@Controller('organizations/:organizationId/transport-modes')
@UseGuards(AuthGuard)
export class TransportModesController {
  constructor(private readonly transportModesService: TransportModesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('organizationId') organizationId: string) {
    return this.transportModesService.list(user.id, organizationId)
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateTransportModeDto,
  ) {
    return this.transportModesService.create(user.id, organizationId, dto)
  }

  @Patch(':transportModeId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('transportModeId') transportModeId: string,
    @Body() dto: UpdateTransportModeDto,
  ) {
    return this.transportModesService.update(user.id, organizationId, transportModeId, dto)
  }

  @Post(':transportModeId/deactivate')
  deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('transportModeId') transportModeId: string,
  ) {
    return this.transportModesService.deactivate(user.id, organizationId, transportModeId)
  }
}
