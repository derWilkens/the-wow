import { Module } from '@nestjs/common'
import { ActivityResourcesController } from './activity-resources.controller'
import { ITToolsController } from './it-tools.controller'
import { OrganizationITToolsController } from './organization-it-tools.controller'
import { ActivityResourcesService } from './activity-resources.service'

@Module({
  controllers: [ActivityResourcesController, ITToolsController, OrganizationITToolsController],
  providers: [ActivityResourcesService],
  exports: [ActivityResourcesService],
})
export class ActivityResourcesModule {}
