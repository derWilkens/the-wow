import { IsArray, IsNotEmpty, IsString } from 'class-validator'

export class CreateSubprocessDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  goal!: string

  @IsArray()
  @IsString({ each: true })
  expected_inputs!: string[]

  @IsArray()
  @IsString({ each: true })
  expected_outputs!: string[]

  @IsArray()
  @IsString({ each: true })
  steps!: string[]
}
