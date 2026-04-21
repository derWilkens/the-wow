import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class UserPreferencesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async get(userId: string, preferenceKey: string) {
    const { data, error } = await this.databaseService.supabase
      .from('user_preferences')
      .select('preference_key, preference_value, updated_at')
      .eq('user_id', userId)
      .eq('preference_key', preferenceKey)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return null
    }

    return {
      key: String(data.preference_key),
      value: data.preference_value,
      updated_at: String(data.updated_at),
    }
  }

  async upsert(userId: string, preferenceKey: string, preferenceValue: unknown) {
    const { data, error } = await this.databaseService.supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preference_key: preferenceKey,
        preference_value: preferenceValue,
        updated_at: new Date().toISOString(),
      })
      .select('preference_key, preference_value, updated_at')
      .single()

    if (error) {
      throw error
    }

    return {
      key: String(data.preference_key),
      value: data.preference_value,
      updated_at: String(data.updated_at),
    }
  }
}
