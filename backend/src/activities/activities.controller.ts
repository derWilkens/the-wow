import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { ActivitiesService } from './activities.service'
import { CreateSubprocessDto } from './dto/create-subprocess.dto'
import { LinkSubprocessDto } from './dto/link-subprocess.dto'
import { UpsertActivityDto } from './dto/upsert-activity.dto'

@Controller('workspaces/:workspaceId/activities')
@UseGuards(AuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.activitiesService.list(user.id, workspaceId, parentId ?? null)
  }

  @Post('upsert')
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpsertActivityDto,
  ) {
    return this.activitiesService.upsert(user.id, workspaceId, dto)
  }

  @Post(':activityId/subprocess')
  createSubprocess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
    @Body() dto: CreateSubprocessDto,
  ) {
    return this.activitiesService.createSubprocess(user.id, workspaceId, activityId, dto)
  }

  @Post(':activityId/subprocess-link')
  linkSubprocess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
    @Body() dto: LinkSubprocessDto,
  ) {
    return this.activitiesService.linkSubprocess(user.id, workspaceId, activityId, dto)
  }

  @Delete(':activityId/subprocess-link')
  unlinkSubprocess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
  ) {
    return this.activitiesService.unlinkSubprocess(user.id, workspaceId, activityId)
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.activitiesService.remove(user.id, workspaceId, id)
  }

  @Get(':activityId/comments')
  listComments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
  ) {
    return this.activitiesService.listComments(user.id, workspaceId, activityId)
  }

  @Post(':activityId/comments')
  createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
    @Body() dto: { body: string },
  ) {
    return this.activitiesService.createComment(user.id, workspaceId, activityId, dto.body)
  }

  @Post(':activityId/comments/:commentId')
  updateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
    @Param('commentId') commentId: string,
    @Body() dto: { body: string },
  ) {
    return this.activitiesService.updateComment(user.id, workspaceId, activityId, commentId, dto.body)
  }

  @Delete(':activityId/comments/:commentId')
  removeComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.activitiesService.removeComment(user.id, workspaceId, activityId, commentId)
  }
}
