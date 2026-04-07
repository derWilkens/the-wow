import { Module } from '@nestjs/common'
import { TransportModesController } from './transport-modes.controller'
import { TransportModesService } from './transport-modes.service'

@Module({
  controllers: [TransportModesController],
  providers: [TransportModesService],
  exports: [TransportModesService],
})
export class TransportModesModule {}
