import { Test } from '@nestjs/testing'
import { DatabaseService } from '../database/database.service'
import { UserPreferencesService } from './user-preferences.service'

describe('UserPreferencesService', () => {
  it('returns null when the preference does not exist', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserPreferencesService,
        {
          provide: DatabaseService,
          useValue: {
            supabase: {
              from: jest.fn(() => query),
            },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(UserPreferencesService)
    await expect(service.get('user-1', 'ui_preferences')).resolves.toBeNull()
    expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1')
    expect(query.eq).toHaveBeenNthCalledWith(2, 'preference_key', 'ui_preferences')
  })

  it('upserts a user preference for the current user', async () => {
    const query = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          preference_key: 'ui_preferences',
          preference_value: { theme_mode: 'system' },
          updated_at: '2026-04-21T10:00:00.000Z',
        },
        error: null,
      }),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserPreferencesService,
        {
          provide: DatabaseService,
          useValue: {
            supabase: {
              from: jest.fn(() => query),
            },
          },
        },
      ],
    }).compile()

    const service = moduleRef.get(UserPreferencesService)
    await expect(service.upsert('user-1', 'ui_preferences', { theme_mode: 'system' })).resolves.toEqual({
      key: 'ui_preferences',
      value: { theme_mode: 'system' },
      updated_at: '2026-04-21T10:00:00.000Z',
    })

    expect(query.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        preference_key: 'ui_preferences',
        preference_value: { theme_mode: 'system' },
      }),
    )
  })
})
