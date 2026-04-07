import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsUUID()
  organization_id!: string

  @IsOptional()
  @IsUUID()
  parent_workspace_id?: string | null

  @IsOptional()
  @IsUUID()
  parent_activity_id?: string | null

  @IsOptional()
  @IsIn(['standalone', 'detail'])
  workflow_scope?: 'standalone' | 'detail'

  @IsOptional()
  @IsString()
  purpose?: string | null

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expected_inputs?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expected_outputs?: string[]
}
