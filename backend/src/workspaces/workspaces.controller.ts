import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { CreateWorkspaceDto } from './dto/create-workspace.dto'
import { WorkspacesService } from './workspaces.service'

@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('organizationId') organizationId: string) {
    return this.workspacesService.list(user.id, organizationId)
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(user.id, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.workspacesService.remove(user.id, id)
  }
}
