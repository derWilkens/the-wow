import { IsOptional, IsString, IsUUID } from 'class-validator'

export class UpdateWorkflowTemplateDto {
  @IsUUID()
  organization_id!: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string | null
}
