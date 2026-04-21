import { IsDefined } from 'class-validator'

export class UpsertUserPreferenceDto {
  @IsDefined()
  preference_value!: unknown
}
