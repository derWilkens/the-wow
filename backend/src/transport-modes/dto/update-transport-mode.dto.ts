import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class UpdateTransportModeDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string | null

  @IsOptional()
  @IsBoolean()
  is_default?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number
}
