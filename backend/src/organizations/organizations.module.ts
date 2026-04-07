import { Module } from '@nestjs/common'
import { OrganizationsController } from './organizations.controller'
import { OrganizationsService } from './organizations.service'
import { TransportModesModule } from '../transport-modes/transport-modes.module'
import { WorkflowTemplatesModule } from '../workflow-templates/workflow-templates.module'

@Module({
  imports: [TransportModesModule, WorkflowTemplatesModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
