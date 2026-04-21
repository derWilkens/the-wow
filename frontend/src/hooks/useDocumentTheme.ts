import { useEffect, useState } from 'react'
import type { UiThemeMode } from '../types'
import { resolveThemeMode } from '../lib/uiPreferences'

function getThemeMediaQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }

  return window.matchMedia('(prefers-color-scheme: dark)')
}

export function useDocumentTheme(themeMode: UiThemeMode) {
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const mediaQuery = getThemeMediaQuery()
    return resolveThemeMode(themeMode, mediaQuery?.matches ?? false)
  })

  useEffect(() => {
    const mediaQuery = getThemeMediaQuery()
    const applyTheme = (prefersDark: boolean) => {
      const nextTheme = resolveThemeMode(themeMode, prefersDark)
      setResolvedTheme(nextTheme)
      document.documentElement.dataset.theme = nextTheme
      document.documentElement.style.colorScheme = nextTheme
    }

    applyTheme(mediaQuery?.matches ?? false)

    if (themeMode !== 'system' || !mediaQuery) {
      return
    }

    const handleChange = (event: MediaQueryListEvent) => {
      applyTheme(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themeMode])

  return resolvedTheme
}
