import { IsString, IsUUID } from 'class-validator'

export class InstantiateWorkflowTemplateDto {
  @IsUUID()
  organization_id!: string

  @IsString()
  name!: string
}
