import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator'

export class LinkActivityToolDto {
  @IsUUID()
  tool_id!: string
}

export class CreateITToolDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsOptional()
  @IsString()
  description?: string | null
}

export class AddCheckSourceDto {
  @IsUUID()
  canvas_object_id!: string

  @IsOptional()
  @IsString()
  notes?: string | null
}
