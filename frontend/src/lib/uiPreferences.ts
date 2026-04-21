import type { CanvasOpenBehavior, UiPreferences, UiThemeMode } from '../types'

export const UI_PREFERENCES_KEY = 'ui_preferences'

export function getDefaultUiPreferences(): UiPreferences {
  return {
    default_grouping_mode: 'free',
    canvas_open_behavior: 'fit_view',
    snap_to_grid: true,
    enable_table_view: false,
    enable_swimlane_view: false,
    enable_node_collision_avoidance: true,
    enable_alignment_guides: true,
    enable_magnetic_connection_targets: true,
    theme_mode: 'system',
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeThemeMode(value: unknown): UiThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function normalizeCanvasOpenBehavior(value: unknown): CanvasOpenBehavior {
  return value === 'remember_last_view' ? 'remember_last_view' : 'fit_view'
}

export function normalizeUiPreferences(value: unknown): UiPreferences {
  const defaults = getDefaultUiPreferences()
  if (!isObject(value)) {
    return defaults
  }

  return {
    default_grouping_mode: value.default_grouping_mode === 'role_lanes' ? 'role_lanes' : 'free',
    canvas_open_behavior: normalizeCanvasOpenBehavior(value.canvas_open_behavior),
    snap_to_grid: typeof value.snap_to_grid === 'boolean' ? value.snap_to_grid : defaults.snap_to_grid,
    enable_table_view: typeof value.enable_table_view === 'boolean' ? value.enable_table_view : defaults.enable_table_view,
    enable_swimlane_view: typeof value.enable_swimlane_view === 'boolean' ? value.enable_swimlane_view : defaults.enable_swimlane_view,
    enable_node_collision_avoidance:
      typeof value.enable_node_collision_avoidance === 'boolean'
        ? value.enable_node_collision_avoidance
        : defaults.enable_node_collision_avoidance,
    enable_alignment_guides:
      typeof value.enable_alignment_guides === 'boolean' ? value.enable_alignment_guides : defaults.enable_alignment_guides,
    enable_magnetic_connection_targets:
      typeof value.enable_magnetic_connection_targets === 'boolean'
        ? value.enable_magnetic_connection_targets
        : defaults.enable_magnetic_connection_targets,
    theme_mode: normalizeThemeMode(value.theme_mode),
  }
}

export function resolveThemeMode(themeMode: UiThemeMode, prefersDark: boolean): 'light' | 'dark' {
  if (themeMode === 'light') {
    return 'light'
  }

  if (themeMode === 'dark') {
    return 'dark'
  }

  return prefersDark ? 'dark' : 'light'
}
