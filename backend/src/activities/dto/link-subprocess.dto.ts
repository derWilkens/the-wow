import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator'

export class LinkSubprocessDto {
  @IsUUID()
  linked_workflow_id!: string

  @IsOptional()
  @IsString()
  linked_workflow_mode?: 'detail' | 'reference' | null

  @IsOptional()
  @IsString()
  linked_workflow_purpose?: string | null

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linked_workflow_inputs?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linked_workflow_outputs?: string[]
}
