import { describe, expect, it } from 'vitest'
import { getDefaultUiPreferences, normalizeUiPreferences, resolveThemeMode } from './uiPreferences'

describe('uiPreferences helpers', () => {
  it('returns defaults when the payload is missing', () => {
    expect(normalizeUiPreferences(undefined)).toEqual(getDefaultUiPreferences())
  })

  it('falls back to system theme for invalid theme values', () => {
    expect(
      normalizeUiPreferences({
        default_grouping_mode: 'role_lanes',
        canvas_open_behavior: 'invalid',
        theme_mode: 'invalid',
      }),
    ).toEqual(
      expect.objectContaining({
        default_grouping_mode: 'role_lanes',
        canvas_open_behavior: 'fit_view',
        theme_mode: 'system',
      }),
    )
  })

  it('defaults the canvas open behavior to fit view', () => {
    expect(getDefaultUiPreferences().canvas_open_behavior).toBe('fit_view')
  })

  it('resolves the explicit and system theme modes', () => {
    expect(resolveThemeMode('light', true)).toBe('light')
    expect(resolveThemeMode('dark', false)).toBe('dark')
    expect(resolveThemeMode('system', true)).toBe('dark')
    expect(resolveThemeMode('system', false)).toBe('light')
  })
})
