import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { InviteOrganizationMemberDto } from './dto/invite-organization-member.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { OrganizationsService } from './organizations.service'

@Controller()
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('organizations')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.list(user.id)
  }

  @Post('organizations')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.id, dto.name)
  }

  @Patch('organizations/:organizationId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(user.id, organizationId, dto.name)
  }

  @Get('organizations/:organizationId/members')
  listMembers(@CurrentUser() user: AuthenticatedUser, @Param('organizationId') organizationId: string) {
    return this.organizationsService.listMembers(user.id, organizationId)
  }

  @Post('organizations/:organizationId/invitations')
  createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() dto: InviteOrganizationMemberDto,
  ) {
    return this.organizationsService.createInvitation(user.id, organizationId, dto)
  }

  @Get('organization-invitations/pending')
  listPendingInvitations(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.listPendingInvitations(user.id, user.email)
  }

  @Post('organization-invitations/:invitationId/accept')
  acceptInvitation(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string) {
    return this.organizationsService.acceptInvitation(user.id, user.email, invitationId)
  }
}
