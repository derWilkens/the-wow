import { IsArray, IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator'

export class UpsertActivityDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @IsOptional()
  @IsUUID()
  parent_id!: string | null

  @IsIn(['activity', 'start_event', 'end_event', 'gateway_decision', 'gateway_merge'])
  node_type!: 'activity' | 'start_event' | 'end_event' | 'gateway_decision' | 'gateway_merge'

  @IsString()
  label!: string

  @IsOptional()
  @IsIn(['email', 'schedule', 'manual', 'webhook', 'file_drop'])
  trigger_type!: 'email' | 'schedule' | 'manual' | 'webhook' | 'file_drop' | null

  @IsNumber()
  position_x!: number

  @IsNumber()
  position_y!: number

  @IsOptional()
  @IsIn(['draft', 'ready_for_review', 'reviewed'])
  status?: 'draft' | 'ready_for_review' | 'reviewed'

  @IsOptional()
  @IsIn(['unclear', 'ok', 'in_progress', 'blocked'])
  status_icon?: 'unclear' | 'ok' | 'in_progress' | 'blocked' | null

  @IsOptional()
  @IsIn(['unbestimmt', 'erstellen', 'transformieren_aktualisieren', 'pruefen_freigeben', 'weiterleiten_ablegen'])
  activity_type?: 'unbestimmt' | 'erstellen' | 'transformieren_aktualisieren' | 'pruefen_freigeben' | 'weiterleiten_ablegen' | null

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null

  @IsOptional()
  @IsString()
  assignee_label?: string | null

  @IsOptional()
  @IsUUID()
  role_id?: string | null

  @IsOptional()
  @IsNumber()
  duration_minutes?: number | null

  @IsOptional()
  @IsUUID()
  linked_workflow_id?: string | null

  @IsOptional()
  @IsIn(['detail', 'reference'])
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
