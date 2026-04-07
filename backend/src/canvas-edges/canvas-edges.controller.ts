import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { CanvasEdgesService } from './canvas-edges.service'
import { UpsertCanvasEdgeDto } from './dto/upsert-canvas-edge.dto'

@Controller('workspaces/:workspaceId/canvas-edges')
@UseGuards(AuthGuard)
export class CanvasEdgesController {
  constructor(private readonly canvasEdgesService: CanvasEdgesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Query('parentActivityId') parentActivityId?: string,
  ) {
    return this.canvasEdgesService.list(user.id, workspaceId, parentActivityId ?? null)
  }

  @Post('upsert')
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpsertCanvasEdgeDto,
  ) {
    return this.canvasEdgesService.upsert(user.id, workspaceId, dto)
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.canvasEdgesService.remove(user.id, workspaceId, id)
  }
}
