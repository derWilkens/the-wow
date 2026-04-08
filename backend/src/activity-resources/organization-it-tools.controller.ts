import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { ActivityResourcesService } from './activity-resources.service'
import { CreateITToolDto, UpdateITToolDto } from './dto/activity-resources.dto'

@Controller('organizations/:organizationId/it-tools')
@UseGuards(AuthGuard)
export class OrganizationITToolsController {
  constructor(private readonly activityResourcesService: ActivityResourcesService) {}

  @Get()
  listTools(@CurrentUser() user: AuthenticatedUser, @Param('organizationId') organizationId: string) {
    return this.activityResourcesService.listOrganizationTools(user.id, organizationId)
  }

  @Post()
  createTool(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateITToolDto,
  ) {
    return this.activityResourcesService.createOrganizationTool(user.id, organizationId, dto)
  }

  @Patch(':toolId')
  updateTool(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('toolId') toolId: string,
    @Body() dto: UpdateITToolDto,
  ) {
    return this.activityResourcesService.updateOrganizationTool(user.id, organizationId, toolId, dto)
  }

  @Delete(':toolId')
  deleteTool(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('toolId') toolId: string,
  ) {
    return this.activityResourcesService.deleteOrganizationTool(user.id, organizationId, toolId)
  }
}
