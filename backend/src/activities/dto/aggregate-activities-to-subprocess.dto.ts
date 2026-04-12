import { ArrayMinSize, IsArray, IsString, IsUUID } from 'class-validator'

export class AggregateActivitiesToSubprocessDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  activity_ids!: string[]
}
