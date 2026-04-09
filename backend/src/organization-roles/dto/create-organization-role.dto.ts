import { IsOptional, IsString, MinLength } from 'class-validator'

export class CreateOrganizationRoleDto {
  @IsString()
  @MinLength(1)
  label!: string

  @IsOptional()
  @IsString()
  acronym?: string | null

  @IsOptional()
  @IsString()
  description?: string | null
}
