import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { CanvasObjectsService } from './canvas-objects.service'
import { UpsertCanvasObjectDto } from './dto/upsert-canvas-object.dto'

@Controller('workspaces/:workspaceId/canvas-objects')
@UseGuards(AuthGuard)
export class CanvasObjectsController {
  constructor(private readonly canvasObjectsService: CanvasObjectsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Query('parentActivityId') parentActivityId?: string,
  ) {
    return this.canvasObjectsService.list(user.id, workspaceId, parentActivityId ?? null)
  }

  @Post('upsert')
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpsertCanvasObjectDto,
  ) {
    return this.canvasObjectsService.upsert(user.id, workspaceId, dto)
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.canvasObjectsService.remove(user.id, workspaceId, id)
  }
}
