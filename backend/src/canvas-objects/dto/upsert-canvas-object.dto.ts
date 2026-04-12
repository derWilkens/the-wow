import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, ValidateIf, ValidateNested } from 'class-validator'

class ObjectFieldDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @IsString()
  name!: string

  @IsIn(['text', 'integer', 'decimal', 'date', 'boolean'])
  field_type!: 'text' | 'integer' | 'decimal' | 'date' | 'boolean'

  @IsBoolean()
  required!: boolean

  @IsNumber()
  sort_order!: number
}

export class UpsertCanvasObjectDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @IsOptional()
  @IsUUID()
  parent_activity_id!: string | null

  @IsIn(['quelle', 'datenobjekt'])
  object_type!: 'quelle' | 'datenobjekt'

  @IsString()
  name!: string

  @IsOptional()
  @IsBoolean()
  is_locked?: boolean

  @IsOptional()
  @IsUUID()
  edge_id?: string | null

  @ValidateIf((o: UpsertCanvasObjectDto) => o.object_type === 'quelle')
  @IsNumber()
  position_x?: number

  @ValidateIf((o: UpsertCanvasObjectDto) => o.object_type === 'quelle')
  @IsNumber()
  position_y?: number

  @ValidateIf((o: UpsertCanvasObjectDto) => o.object_type === 'datenobjekt')
  @IsNumber()
  edge_sort_order?: number

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ObjectFieldDto)
  fields?: ObjectFieldDto[]
}
