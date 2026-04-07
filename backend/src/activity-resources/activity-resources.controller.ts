import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { ActivityResourcesService } from './activity-resources.service'
import { AddCheckSourceDto, LinkActivityToolDto } from './dto/activity-resources.dto'

@Controller('workspaces/:workspaceId/activities/:activityId')
@UseGuards(AuthGuard)
export class ActivityResourcesController {
  constructor(private readonly activityResourcesService: ActivityResourcesService) {}

  @Get('tools')
  listTools(@CurrentUser() user: AuthenticatedUser, @Param('workspaceId') workspaceId: string, @Param('activityId') activityId: string) {
    return this.activityResourcesService.listTools(user.id, workspaceId, activityId)
  }

  @Post('tools')
  addTool(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
    @Body() dto: LinkActivityToolDto,
  ) {
    return this.activityResourcesService.linkTool(user.id, workspaceId, activityId, dto.tool_id)
  }

  @Delete('tools/:toolId')
  removeTool(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
    @Param('toolId') toolId: string,
  ) {
    return this.activityResourcesService.removeTool(user.id, workspaceId, activityId, toolId)
  }

  @Get('check-sources')
  listCheckSources(@CurrentUser() user: AuthenticatedUser, @Param('workspaceId') workspaceId: string, @Param('activityId') activityId: string) {
    return this.activityResourcesService.listCheckSources(user.id, workspaceId, activityId)
  }

  @Post('check-sources')
  addCheckSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
    @Body() dto: AddCheckSourceDto,
  ) {
    return this.activityResourcesService.addCheckSource(user.id, workspaceId, activityId, dto)
  }

  @Delete('check-sources/:id')
  removeCheckSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
    @Param('id') id: string,
  ) {
    return this.activityResourcesService.removeCheckSource(user.id, workspaceId, activityId, id)
  }
}
