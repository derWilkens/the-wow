import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator'

export class UpsertCanvasGroupDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @IsOptional()
  @IsUUID()
  parent_activity_id!: string | null

  @IsString()
  label!: string

  @IsNumber()
  position_x!: number

  @IsNumber()
  position_y!: number

  @IsNumber()
  width!: number

  @IsNumber()
  height!: number

  @IsOptional()
  @IsBoolean()
  locked?: boolean

  @IsOptional()
  @IsBoolean()
  collapsed?: boolean

  @IsOptional()
  @IsNumber()
  z_index?: number
}
