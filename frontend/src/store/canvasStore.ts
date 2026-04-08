import { create } from 'zustand'

const ORGANIZATION_STORAGE_KEY = 'wow-active-organization-id'

function readStoredOrganizationId() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(ORGANIZATION_STORAGE_KEY)
}

function writeStoredOrganizationId(organizationId: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (organizationId) {
    window.localStorage.setItem(ORGANIZATION_STORAGE_KEY, organizationId)
    return
  }

  window.localStorage.removeItem(ORGANIZATION_STORAGE_KEY)
}

interface BreadcrumbItem {
  id: string
  label: string
}

interface WorkspaceTrailItem {
  workspaceId: string
  workspaceName: string
  viaActivityId: string | null
  viaActivityLabel: string | null
}

interface CanvasStore {
  organizationId: string | null
  organizationName: string | null
  organizationRole: 'owner' | 'admin' | 'member' | null
  workspaceId: string | null
  workspaceName: string | null
  parentActivityId: string | null
  breadcrumb: BreadcrumbItem[]
  workspaceTrail: WorkspaceTrailItem[]
  selectOrganization: (organizationId: string, organizationName: string, organizationRole: 'owner' | 'admin' | 'member') => void
  updateOrganizationName: (organizationName: string) => void
  leaveOrganization: () => void
  openWorkspace: (workspaceId: string, workspaceName: string) => void
  openWorkspacePath: (trail: WorkspaceTrailItem[]) => void
  openSubprocessWorkspace: (
    workspaceId: string,
    workspaceName: string,
    viaActivityId: string,
    viaActivityLabel: string,
  ) => void
  navigateToWorkspaceTrail: (workspaceId: string) => void
  leaveWorkspace: () => void
  drillInto: (id: string, label: string) => void
  navigateToBreadcrumb: (activityId: string | null) => void
  resetToRoot: () => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  organizationId: readStoredOrganizationId(),
  organizationName: null,
  organizationRole: null,
  workspaceId: null,
  workspaceName: null,
  parentActivityId: null,
  breadcrumb: [],
  workspaceTrail: [],
  selectOrganization: (organizationId, organizationName, organizationRole) =>
    set(() => {
      writeStoredOrganizationId(organizationId)
      return {
        organizationId,
        organizationName,
        organizationRole,
        workspaceId: null,
        workspaceName: null,
        parentActivityId: null,
        breadcrumb: [],
        workspaceTrail: [],
      }
    }),
  updateOrganizationName: (organizationName) => set(() => ({ organizationName })),
  leaveOrganization: () =>
    set(() => {
      writeStoredOrganizationId(null)
      return {
        organizationId: null,
        organizationName: null,
        organizationRole: null,
        workspaceId: null,
        workspaceName: null,
        parentActivityId: null,
        breadcrumb: [],
        workspaceTrail: [],
      }
    }),
  openWorkspace: (workspaceId, workspaceName) =>
    set({
      workspaceId,
      workspaceName,
      parentActivityId: null,
      breadcrumb: [],
      workspaceTrail: [{ workspaceId, workspaceName, viaActivityId: null, viaActivityLabel: null }],
    }),
  openWorkspacePath: (trail) =>
    set({
      workspaceId: trail[trail.length - 1]?.workspaceId ?? null,
      workspaceName: trail[trail.length - 1]?.workspaceName ?? null,
      parentActivityId: null,
      breadcrumb: [],
      workspaceTrail: trail,
    }),
  openSubprocessWorkspace: (workspaceId, workspaceName, viaActivityId, viaActivityLabel) =>
    set((state) => ({
      workspaceId,
      workspaceName,
      parentActivityId: null,
      breadcrumb: [],
      workspaceTrail: [
        ...state.workspaceTrail,
        { workspaceId, workspaceName, viaActivityId, viaActivityLabel },
      ],
    })),
  navigateToWorkspaceTrail: (workspaceId) =>
    set((state) => {
      const nextTrail = state.workspaceTrail.slice(
        0,
        state.workspaceTrail.findIndex((item) => item.workspaceId === workspaceId) + 1,
      )

      return {
        workspaceId: nextTrail[nextTrail.length - 1]?.workspaceId ?? null,
        workspaceName: nextTrail[nextTrail.length - 1]?.workspaceName ?? null,
        parentActivityId: null,
        breadcrumb: [],
        workspaceTrail: nextTrail,
      }
    }),
  leaveWorkspace: () =>
    set({ workspaceId: null, workspaceName: null, parentActivityId: null, breadcrumb: [], workspaceTrail: [] }),
  drillInto: (id, label) =>
    set((state) => ({
      parentActivityId: id,
      breadcrumb: [...state.breadcrumb, { id, label }],
    })),
  navigateToBreadcrumb: (activityId) =>
    set((state) => ({
      parentActivityId: activityId,
      breadcrumb: activityId ? state.breadcrumb.slice(0, state.breadcrumb.findIndex((item) => item.id === activityId) + 1) : [],
    })),
  resetToRoot: () => set({ parentActivityId: null, breadcrumb: [] }),
}))
