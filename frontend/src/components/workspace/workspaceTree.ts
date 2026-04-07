import type { Workspace } from '../../types'

export interface WorkspaceTrailItem {
  workspaceId: string
  workspaceName: string
  viaActivityId: string | null
  viaActivityLabel: string | null
}

export interface WorkspaceTreeNode {
  workspace: Workspace
  children: WorkspaceTreeNode[]
}

export function buildWorkspacePath(workspaces: Workspace[], workspace: Workspace) {
  const byId = new Map(workspaces.map((item) => [item.id, item]))
  const trail: WorkspaceTrailItem[] = []
  let current: Workspace | undefined = workspace

  while (current) {
    trail.unshift({
      workspaceId: current.id,
      workspaceName: current.name,
      viaActivityId: current.parent_activity_id,
      viaActivityLabel: null,
    })
    current = current.parent_workspace_id ? byId.get(current.parent_workspace_id) : undefined
  }

  if (trail.length > 0) {
    trail[0] = { ...trail[0], viaActivityId: null, viaActivityLabel: null }
  }

  return trail
}

export function buildWorkspaceTree(workspaces: Workspace[]) {
  const sorted = [...workspaces].sort((left, right) => left.created_at.localeCompare(right.created_at))
  const nodes = new Map<string, WorkspaceTreeNode>(
    sorted.map((workspace) => [workspace.id, { workspace, children: [] }]),
  )
  const roots: WorkspaceTreeNode[] = []

  for (const workspace of sorted) {
    const node = nodes.get(workspace.id)!
    if (workspace.parent_workspace_id) {
      const parent = nodes.get(workspace.parent_workspace_id)
      if (parent) {
        parent.children.push(node)
        continue
      }
    }
    roots.push(node)
  }

  return roots
}

export function countDescendantWorkspaces(node: WorkspaceTreeNode): number {
  return node.children.reduce((count, child) => count + 1 + countDescendantWorkspaces(child), 0)
}

export function collectExpandedIdsForSearch(nodes: WorkspaceTreeNode[], search: string) {
  const normalized = search.trim().toLowerCase()
  if (!normalized) {
    return new Set<string>()
  }

  const expanded = new Set<string>()

  function visit(node: WorkspaceTreeNode): boolean {
    const matchesSelf = node.workspace.name.toLowerCase().includes(normalized)
    let matchesChild = false

    for (const child of node.children) {
      if (visit(child)) {
        expanded.add(node.workspace.id)
        matchesChild = true
      }
    }

    return matchesSelf || matchesChild
  }

  for (const node of nodes) {
    visit(node)
  }

  return expanded
}

export function matchesWorkspaceSearch(node: WorkspaceTreeNode, search: string): boolean {
  const normalized = search.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  if (node.workspace.name.toLowerCase().includes(normalized)) {
    return true
  }

  return node.children.some((child) => matchesWorkspaceSearch(child, normalized))
}
