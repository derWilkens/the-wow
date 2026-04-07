import { describe, expect, it } from 'vitest'
import type { Workspace } from '../../types'
import {
  buildWorkspacePath,
  buildWorkspaceTree,
  collectExpandedIdsForSearch,
  countDescendantWorkspaces,
  matchesWorkspaceSearch,
} from './workspaceTree'

function createWorkspace(id: string, name: string, parentWorkspaceId: string | null = null): Workspace {
  return {
    id,
    organization_id: 'org-1',
    name,
    created_by: 'user-1',
    created_at: `2026-04-03T00:00:0${id.length}.000Z`,
    parent_workspace_id: parentWorkspaceId,
    parent_activity_id: parentWorkspaceId ? `activity-${id}` : null,
    workflow_scope: parentWorkspaceId ? 'detail' : 'standalone',
    purpose: null,
    expected_inputs: [],
    expected_outputs: [],
  }
}

describe('workspaceTree helpers', () => {
  const workspaces = [
    createWorkspace('root-1', 'Rechnungspruefung'),
    createWorkspace('child-1', 'Freigabe pruefen', 'root-1'),
    createWorkspace('grandchild-1', 'Unterlagen validieren', 'child-1'),
    createWorkspace('root-2', 'Zahlung vorbereiten'),
  ]

  it('builds nested trees and descendant counts', () => {
    const roots = buildWorkspaceTree(workspaces)

    expect(roots).toHaveLength(2)
    expect(roots[0].workspace.id).toBe('root-1')
    expect(roots[0].children[0].workspace.id).toBe('child-1')
    expect(countDescendantWorkspaces(roots[0])).toBe(2)
    expect(countDescendantWorkspaces(roots[1])).toBe(0)
  })

  it('builds the navigation path for deep subprocesses', () => {
    const trail = buildWorkspacePath(workspaces, workspaces[2])
    expect(trail.map((item) => item.workspaceId)).toEqual(['root-1', 'child-1', 'grandchild-1'])
  })

  it('expands ancestors and matches nested search results', () => {
    const roots = buildWorkspaceTree(workspaces)
    const expanded = collectExpandedIdsForSearch(roots, 'validieren')

    expect(expanded.has('root-1')).toBe(true)
    expect(expanded.has('child-1')).toBe(true)
    expect(matchesWorkspaceSearch(roots[0], 'validieren')).toBe(true)
    expect(matchesWorkspaceSearch(roots[1], 'validieren')).toBe(false)
  })
})
