import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { CreateITToolDto } from './dto/activity-resources.dto'
import { ActivityResourcesService } from './activity-resources.service'

@Controller('workspaces/:workspaceId/it-tools')
@UseGuards(AuthGuard)
export class ITToolsController {
  constructor(private readonly activityResourcesService: ActivityResourcesService) {}

  @Get()
  listTools(@CurrentUser() user: AuthenticatedUser, @Param('workspaceId') workspaceId: string) {
    return this.activityResourcesService.listAvailableTools(user.id, workspaceId)
  }

  @Post()
  createTool(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateITToolDto,
  ) {
    return this.activityResourcesService.createTool(user.id, workspaceId, dto)
  }
}
