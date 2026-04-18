import { Module } from '@nestjs/common'
import { CanvasGroupsController } from './canvas-groups.controller'
import { CanvasGroupsService } from './canvas-groups.service'

@Module({
  controllers: [CanvasGroupsController],
  providers: [CanvasGroupsService],
  exports: [CanvasGroupsService],
})
export class CanvasGroupsModule {}
