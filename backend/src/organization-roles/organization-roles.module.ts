import { Module } from '@nestjs/common'
import { OrganizationRolesController } from './organization-roles.controller'
import { OrganizationRolesService } from './organization-roles.service'

@Module({
  controllers: [OrganizationRolesController],
  providers: [OrganizationRolesService],
  exports: [OrganizationRolesService],
})
export class OrganizationRolesModule {}
