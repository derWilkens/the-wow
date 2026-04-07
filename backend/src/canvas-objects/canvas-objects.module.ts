import { Module } from '@nestjs/common'
import { CanvasObjectsController } from './canvas-objects.controller'
import { CanvasObjectsService } from './canvas-objects.service'

@Module({
  controllers: [CanvasObjectsController],
  providers: [CanvasObjectsService],
  exports: [CanvasObjectsService],
})
export class CanvasObjectsModule {}
