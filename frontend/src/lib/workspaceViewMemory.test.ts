import { describe, expect, it } from 'vitest'
import { normalizeWorkspaceViewMemory } from './workspaceViewMemory'

describe('workspaceViewMemory helpers', () => {
  it('returns an empty object for invalid payloads', () => {
    expect(normalizeWorkspaceViewMemory(undefined)).toEqual({})
    expect(normalizeWorkspaceViewMemory('invalid')).toEqual({})
  })

  it('keeps only valid viewport entries', () => {
    expect(
      normalizeWorkspaceViewMemory({
        'workspace-1': { x: 120, y: 240, zoom: 1.2 },
        'workspace-2': { x: 'bad', y: 240, zoom: 1.2 },
      }),
    ).toEqual({
      'workspace-1': { x: 120, y: 240, zoom: 1.2 },
    })
  })
})
