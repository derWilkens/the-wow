import { IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateWorkflowTemplateDto {
  @IsUUID()
  organization_id!: string

  @IsUUID()
  source_workspace_id!: string

  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  description?: string | null
}
