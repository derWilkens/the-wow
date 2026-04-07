import { describe, expect, it } from 'vitest'
import { normalizeApiBaseUrl } from './api-client'

describe('normalizeApiBaseUrl', () => {
  it('removes trailing slashes', () => {
    expect(normalizeApiBaseUrl('https://the-wow-sigma.vercel.app/')).toBe('https://the-wow-sigma.vercel.app')
    expect(normalizeApiBaseUrl('https://the-wow-sigma.vercel.app///')).toBe('https://the-wow-sigma.vercel.app')
  })

  it('preserves a clean url', () => {
    expect(normalizeApiBaseUrl('https://the-wow-sigma.vercel.app')).toBe('https://the-wow-sigma.vercel.app')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeApiBaseUrl('  https://the-wow-sigma.vercel.app/  ')).toBe('https://the-wow-sigma.vercel.app')
  })
})
