import { IsArray, IsOptional, IsString } from 'class-validator'

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  name?: string

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
