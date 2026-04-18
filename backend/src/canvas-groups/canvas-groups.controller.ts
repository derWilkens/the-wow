import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { CanvasGroupsService } from './canvas-groups.service'
import { UpsertCanvasGroupDto } from './dto/upsert-canvas-group.dto'

@Controller('workspaces/:workspaceId/canvas-groups')
@UseGuards(AuthGuard)
export class CanvasGroupsController {
  constructor(private readonly canvasGroupsService: CanvasGroupsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Query('parentActivityId') parentActivityId?: string,
  ) {
    return this.canvasGroupsService.list(user.id, workspaceId, parentActivityId ?? null)
  }

  @Post('upsert')
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpsertCanvasGroupDto,
  ) {
    return this.canvasGroupsService.upsert(user.id, workspaceId, dto)
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.canvasGroupsService.remove(user.id, workspaceId, id)
  }
}
