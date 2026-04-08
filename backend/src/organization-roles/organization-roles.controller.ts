import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { CreateOrganizationRoleDto } from './dto/create-organization-role.dto'
import { UpdateOrganizationRoleDto } from './dto/update-organization-role.dto'
import { OrganizationRolesService } from './organization-roles.service'

@Controller('organizations/:organizationId/roles')
@UseGuards(AuthGuard)
export class OrganizationRolesController {
  constructor(private readonly organizationRolesService: OrganizationRolesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('organizationId') organizationId: string) {
    return this.organizationRolesService.list(user.id, organizationId)
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateOrganizationRoleDto,
  ) {
    return this.organizationRolesService.create(user.id, organizationId, dto)
  }

  @Patch(':roleId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateOrganizationRoleDto,
  ) {
    return this.organizationRolesService.update(user.id, organizationId, roleId, dto)
  }

  @Delete(':roleId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.organizationRolesService.remove(user.id, organizationId, roleId)
  }
}
