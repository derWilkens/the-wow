import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator'

export class UpsertCanvasEdgeDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @IsOptional()
  @IsUUID()
  parent_activity_id!: string | null

  @IsIn(['activity', 'canvas_object'])
  from_node_type!: 'activity' | 'canvas_object'

  @IsUUID()
  from_node_id!: string

  @IsOptional()
  @IsString()
  from_handle_id?: string | null

  @IsIn(['activity', 'canvas_object'])
  to_node_type!: 'activity' | 'canvas_object'

  @IsUUID()
  to_node_id!: string

  @IsOptional()
  @IsString()
  to_handle_id?: string | null

  @IsOptional()
  @IsString()
  label?: string | null

  @IsOptional()
  @IsUUID()
  transport_mode_id?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null
}
