import { Module } from '@nestjs/common'
import { ActivityResourcesController } from './activity-resources.controller'
import { ITToolsController } from './it-tools.controller'
import { ActivityResourcesService } from './activity-resources.service'

@Module({
  controllers: [ActivityResourcesController, ITToolsController],
  providers: [ActivityResourcesService],
  exports: [ActivityResourcesService],
})
export class ActivityResourcesModule {}
