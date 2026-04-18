import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ActivitiesModule } from './activities/activities.module'
import { ActivityResourcesModule } from './activity-resources/activity-resources.module'
import { AuthModule } from './auth/auth.module'
import { CanvasEdgesModule } from './canvas-edges/canvas-edges.module'
import { CanvasGroupsModule } from './canvas-groups/canvas-groups.module'
import { CanvasObjectsModule } from './canvas-objects/canvas-objects.module'
import { DatabaseModule } from './database/database.module'
import { OrganizationsModule } from './organizations/organizations.module'
import { OrganizationRolesModule } from './organization-roles/organization-roles.module'
import { TransportModesModule } from './transport-modes/transport-modes.module'
import { WorkflowTemplatesModule } from './workflow-templates/workflow-templates.module'
import { WorkspacesModule } from './workspaces/workspaces.module'
import { HealthController } from './health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    OrganizationsModule,
    OrganizationRolesModule,
    TransportModesModule,
    WorkflowTemplatesModule,
    WorkspacesModule,
    ActivitiesModule,
    CanvasGroupsModule,
    CanvasObjectsModule,
    CanvasEdgesModule,
    ActivityResourcesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
