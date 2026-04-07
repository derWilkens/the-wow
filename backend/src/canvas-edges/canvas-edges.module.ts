import { Module } from '@nestjs/common'
import { CanvasEdgesController } from './canvas-edges.controller'
import { CanvasEdgesService } from './canvas-edges.service'

@Module({
  controllers: [CanvasEdgesController],
  providers: [CanvasEdgesService],
  exports: [CanvasEdgesService],
})
export class CanvasEdgesModule {}
