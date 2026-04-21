import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentTheme } from './useDocumentTheme'

class MatchMediaMock {
  matches: boolean
  listeners = new Set<(event: MediaQueryListEvent) => void>()

  constructor(matches: boolean) {
    this.matches = matches
  }

  addEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
    this.listeners.add(listener)
  }

  removeEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
    this.listeners.delete(listener)
  }

  emit(matches: boolean) {
    this.matches = matches
    const event = { matches } as MediaQueryListEvent
    this.listeners.forEach((listener) => listener(event))
  }
}

function ThemeProbe({ themeMode }: { themeMode: 'system' | 'light' | 'dark' }) {
  const resolvedTheme = useDocumentTheme(themeMode)
  return <div data-testid="resolved-theme">{resolvedTheme}</div>
}

describe('useDocumentTheme', () => {
  let mediaQuery: MatchMediaMock

  beforeEach(() => {
    mediaQuery = new MatchMediaMock(false)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => mediaQuery),
    })
    delete document.documentElement.dataset.theme
    document.documentElement.style.colorScheme = ''
  })

  it('applies the explicit light and dark themes to the root element', () => {
    const { rerender } = render(<ThemeProbe themeMode="light" />)

    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')

    rerender(<ThemeProbe themeMode="dark" />)

    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('follows system changes when the mode is system', () => {
    render(<ThemeProbe themeMode="system" />)

    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    act(() => {
      mediaQuery.emit(true)
    })

    return waitFor(() => {
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
      expect(document.documentElement.dataset.theme).toBe('dark')
      expect(document.documentElement.style.colorScheme).toBe('dark')
    })
  })
})
