import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard'
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto'
import { InstantiateWorkflowTemplateDto } from './dto/instantiate-workflow-template.dto'
import { UpdateWorkflowTemplateDto } from './dto/update-workflow-template.dto'
import { WorkflowTemplatesService } from './workflow-templates.service'

@Controller()
@UseGuards(AuthGuard)
export class WorkflowTemplatesController {
  constructor(private readonly workflowTemplatesService: WorkflowTemplatesService) {}

  @Get('workflow-templates')
  list(@CurrentUser() user: AuthenticatedUser, @Query('organizationId') organizationId: string) {
    return this.workflowTemplatesService.list(user.id, organizationId)
  }

  @Post('workflow-templates')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkflowTemplateDto) {
    return this.workflowTemplatesService.create(user.id, dto)
  }

  @Patch('workflow-templates/:templateId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateWorkflowTemplateDto,
  ) {
    return this.workflowTemplatesService.update(user.id, templateId, dto)
  }

  @Delete('workflow-templates/:templateId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId') templateId: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.workflowTemplatesService.remove(user.id, templateId, organizationId)
  }

  @Post('workflow-templates/:templateId/instantiate')
  instantiate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId') templateId: string,
    @Body() dto: InstantiateWorkflowTemplateDto,
  ) {
    return this.workflowTemplatesService.instantiate(user.id, templateId, dto)
  }
}
