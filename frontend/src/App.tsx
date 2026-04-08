import { Loader2 } from 'lucide-react'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { Connection } from 'reactflow'
import { toPng } from 'html-to-image'
import { useActivities, useCreateSubprocess, useDeleteActivity, useLinkSubprocess, useUnlinkSubprocess, useUpsertActivity } from './api/activities'
import { useAcceptOrganizationInvitation, useCreateOrganization, useOrganizations, usePendingOrganizationInvitations } from './api/organizations'
import { useOrganizationRoles } from './api/organizationRoles'
import { useCanvasEdges, useDeleteCanvasEdge, useUpsertCanvasEdge } from './api/canvasEdges'
import { useCanvasObjects, useDeleteCanvasObject, useUpsertCanvasObject } from './api/canvasObjects'
import { useCreateTransportMode, useTransportModes } from './api/transportModes'
import { useWorkspaces } from './api/workspaces'
import { AuthScreen } from './components/auth/AuthScreen'
import { ActivityDetailPopup } from './components/canvas/ActivityDetailPopup'
import { DataObjectPopup } from './components/canvas/DataObjectPopup'
import { EdgeDetailPanel } from './components/canvas/EdgeDetailPanel'
import { FloatingCanvasToolbar } from './components/canvas/FloatingCanvasToolbar'
import { LinkWorkflowModal } from './components/canvas/LinkWorkflowModal'
import { OrganizationAccessScreen } from './components/organization/OrganizationAccessScreen'
import { SubprocessMenu } from './components/canvas/SubprocessMenu'
import { SubprocessWizard } from './components/canvas/SubprocessWizard'
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas'
import { WorkflowSipocTable } from './components/canvas/WorkflowSipocTable'
import { deriveWorkflowSipocRows, getReusableDataObjectsForEdge } from './components/canvas/canvasData'
import { AppHeader, type CanvasSearchOption } from './components/layout/AppHeader'
import { SettingsDialog } from './components/settings/SettingsDialog'
import { WorkspaceList } from './components/workspace/WorkspaceList'
import { useAuthSession } from './hooks/useAuthSession'
import { supabase } from './lib/supabase'
import { useCanvasStore } from './store/canvasStore'
import type {
  Activity,
  CanvasEdge,
  CanvasGroupingMode,
  CanvasObject,
  EdgeDataObject,
  ObjectField,
  TransportModeOption,
  UpsertCanvasObjectInput,
  WorkflowViewMode,
  Workspace,
} from './types'

const UI_PREFERENCES_STORAGE_KEY = 'wow-ui-preferences'

function readDefaultGroupingMode(): CanvasGroupingMode {
  if (typeof window === 'undefined') {
    return 'free'
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY) ?? '{}') as {
      default_grouping_mode?: CanvasGroupingMode
    }
    return parsed.default_grouping_mode === 'role_lanes' ? 'role_lanes' : 'free'
  } catch {
    return 'free'
  }
}

interface CanvasSnapshot {
  activities: Activity[]
  canvasObjects: CanvasObject[]
  canvasEdges: CanvasEdge[]
}

const emptySnapshot: CanvasSnapshot = {
  activities: [],
  canvasObjects: [],
  canvasEdges: [],
}

export default function App() {
  const { session, isLoading } = useAuthSession()
  const { organizationId, organizationRole, workspaceId, workspaceName, selectOrganization, leaveOrganization } = useCanvasStore()
  const { data: organizations = [], isLoading: organizationsLoading } = useOrganizations(Boolean(session))
  const { data: pendingInvitations = [], isLoading: invitationsLoading } = usePendingOrganizationInvitations(Boolean(session))
  const createOrganization = useCreateOrganization()
  const acceptInvitation = useAcceptOrganizationInvitation()

  useEffect(() => {
    if (organizations.length === 0) {
      if (organizationId) {
        leaveOrganization()
      }
      return
    }

    const selectedOrganization = organizations.find((organization) => organization.id === organizationId)
    if (selectedOrganization) {
      return
    }

    if (organizations.length === 1) {
      const [organization] = organizations
      selectOrganization(organization.id, organization.name, organization.membership_role)
    }
  }, [leaveOrganization, organizationId, organizations, selectOrganization])

  if (isLoading || (session && (organizationsLoading || invitationsLoading))) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  if (organizations.length === 0 || !organizationId) {
    return (
      <OrganizationAccessScreen
        organizations={organizations}
        pendingInvitations={pendingInvitations}
        isCreating={createOrganization.isPending}
        isAccepting={acceptInvitation.isPending}
        onCreateOrganization={async (name) => {
          const organization = await createOrganization.mutateAsync(name)
          selectOrganization(organization.id, organization.name, organization.membership_role)
        }}
        onAcceptInvitation={async (invitationId) => {
          const organization = await acceptInvitation.mutateAsync(invitationId)
          selectOrganization(organization.id, organization.name, organization.membership_role)
        }}
        onSelectOrganization={(organization) => selectOrganization(organization.id, organization.name, organization.membership_role)}
      />
    )
  }

  if (!workspaceId || !workspaceName) {
    return <WorkspaceList />
  }

  return (
    <WorkspaceCanvasApp
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      organizationId={organizationId}
      organizationRole={organizationRole}
      currentUserId={session.user.id}
    />
  )
}

function cloneSnapshot(snapshot: CanvasSnapshot): CanvasSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as CanvasSnapshot
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

function areFieldsEqual(left: ObjectField[] | undefined, right: ObjectField[] | undefined) {
  const leftFields = left ?? []
  const rightFields = right ?? []
  if (leftFields.length !== rightFields.length) {
    return false
  }

  return leftFields.every((field, index) => {
    const other = rightFields[index]
    return (
      Boolean(other) &&
      field.name === other.name &&
      field.field_type === other.field_type &&
      field.required === other.required &&
      field.sort_order === other.sort_order
    )
  })
}

function getCanvasNodeKind(nodeId: string, activities: Activity[], sourceObjects: Extract<CanvasObject, { object_type: 'quelle' }>[]) {
  const activity = activities.find((item) => item.id === nodeId)
  if (activity) {
    return { kind: 'activity' as const, activity }
  }

  const sourceObject = sourceObjects.find((item) => item.id === nodeId)
  if (sourceObject) {
    return { kind: 'source' as const, sourceObject }
  }

  return null
}

function getOppositeTargetHandleId(sourceHandleId: string | null) {
  if (!sourceHandleId) {
    return 'target-left'
  }

  if (sourceHandleId.endsWith('left')) {
    return 'target-right'
  }

  if (sourceHandleId.endsWith('right')) {
    return 'target-left'
  }

  if (sourceHandleId.endsWith('top')) {
    return 'target-bottom'
  }

  if (sourceHandleId.endsWith('bottom')) {
    return 'target-top'
  }

  return 'target-left'
}

const DEFAULT_ACTIVITY_NODE_SIZE = {
  width: 220,
  height: 140,
}

const DEFAULT_NODE_SIZES = {
  activity: { width: 220, height: 140 },
  start_event: { width: 96, height: 96 },
  end_event: { width: 96, height: 96 },
  gateway_decision: { width: 140, height: 140 },
  gateway_merge: { width: 140, height: 140 },
  quelle: { width: 176, height: 88 },
  datenobjekt: { width: 220, height: 116 },
} as const
const SMART_INSERT_GAP = 120

function getNewActivityPositionForDrop(position: { x: number; y: number }, targetHandleId: string) {
  const { width, height } = DEFAULT_ACTIVITY_NODE_SIZE

  switch (targetHandleId) {
    case 'target-right':
      return { x: position.x - width, y: position.y - height / 2 }
    case 'target-top':
      return { x: position.x - width / 2, y: position.y }
    case 'target-bottom':
      return { x: position.x - width / 2, y: position.y - height }
    case 'target-left':
    default:
      return { x: position.x, y: position.y - height / 2 }
  }
}

function getPositionForExplicitDrop(kind: keyof typeof DEFAULT_NODE_SIZES, position: { x: number; y: number }) {
  const size = DEFAULT_NODE_SIZES[kind]
  return {
    x: position.x - size.width / 2,
    y: position.y - size.height / 2,
  }
}

function getDefaultActivityLabel(nodeType: Activity['node_type']) {
  switch (nodeType) {
    case 'start_event':
      return 'Start'
    case 'end_event':
      return 'Ende'
    case 'gateway_decision':
      return 'Entscheidung'
    case 'gateway_merge':
      return 'Zusammenführung'
    case 'activity':
    default:
      return 'Neue Aktivität'
  }
}

function getDefaultActivityDescription(nodeType: Activity['node_type']) {
  switch (nodeType) {
    case 'activity':
      return 'Beschreibe den nächsten fachlichen Schritt in diesem Ablauf.'
    case 'gateway_decision':
      return 'Lege fest, nach welcher Bedingung der Ablauf in alternative Pfade verzweigt.'
    case 'gateway_merge':
      return 'Führe hier mehrere zuvor getrennte Pfade wieder zusammen.'
    default:
      return null
  }
}

function WorkspaceCanvasApp({
  workspaceId,
  workspaceName,
  organizationId,
  organizationRole,
  currentUserId,
}: {
  workspaceId: string
  workspaceName: string
  organizationId: string
  organizationRole: 'owner' | 'admin' | 'member' | null
  currentUserId: string
}) {
  const {
    parentActivityId,
    leaveWorkspace,
    resetToRoot,
    workspaceTrail,
    openSubprocessWorkspace,
    navigateToWorkspaceTrail,
    organizationName,
    updateOrganizationName,
  } = useCanvasStore()
  const { data: workspaces = [] } = useWorkspaces(organizationId)
  const { data: organizationRoles = [] } = useOrganizationRoles(organizationId)
  const { data: activities = [], isLoading: activitiesLoading } = useActivities(workspaceId, parentActivityId)
  const { data: canvasObjects = [], isLoading: objectsLoading } = useCanvasObjects(workspaceId, parentActivityId)
  const { data: canvasEdges = [] } = useCanvasEdges(workspaceId, parentActivityId)
  const { data: transportModes = [] } = useTransportModes(organizationId)
  const createTransportMode = useCreateTransportMode(organizationId)
  const upsertActivity = useUpsertActivity(workspaceId)
  const createSubprocess = useCreateSubprocess(workspaceId)
  const linkSubprocess = useLinkSubprocess(workspaceId)
  const unlinkSubprocess = useUnlinkSubprocess(workspaceId)
  const deleteActivity = useDeleteActivity(workspaceId)
  const upsertCanvasObject = useUpsertCanvasObject(workspaceId)
  const deleteCanvasObject = useDeleteCanvasObject(workspaceId)
  const upsertCanvasEdge = useUpsertCanvasEdge(workspaceId)
  const deleteCanvasEdge = useDeleteCanvasEdge(workspaceId)
  const seedInFlightRef = useRef(false)
  const isApplyingHistoryRef = useRef(false)
  const latestSnapshotRef = useRef<CanvasSnapshot>(emptySnapshot)
  const pendingNodePositionRef = useRef<Record<string, { x: number; y: number }>>({})
  const selectedCanvasNodeIdRef = useRef<string | null>(null)
  const selectedCanvasEdgeIdRef = useRef<string | null>(null)

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [selectedDataObjectId, setSelectedDataObjectId] = useState<string | null>(null)
  const [selectedCanvasNodeId, setSelectedCanvasNodeId] = useState<string | null>(null)
  const [selectedCanvasEdgeId, setSelectedCanvasEdgeId] = useState<string | null>(null)
  const [isActivityPopupOpen, setIsActivityPopupOpen] = useState(false)
  const [isDataObjectPopupOpen, setIsDataObjectPopupOpen] = useState(false)
  const [undoStack, setUndoStack] = useState<CanvasSnapshot[]>([])
  const [redoStack, setRedoStack] = useState<CanvasSnapshot[]>([])
  const [optimisticHiddenNodeIds, setOptimisticHiddenNodeIds] = useState<string[]>([])
  const [optimisticHiddenEdgeIds, setOptimisticHiddenEdgeIds] = useState<string[]>([])
  const [optimisticActivities, setOptimisticActivities] = useState<Activity[]>([])
  const [optimisticCanvasObjects, setOptimisticCanvasObjects] = useState<CanvasObject[]>([])
  const [optimisticEdges, setOptimisticEdges] = useState<CanvasEdge[]>([])
  const [edgeAttributeOverrides, setEdgeAttributeOverrides] = useState<
    Record<string, { label: string | null; transport_mode_id: string | null; notes: string | null }>
  >({})
  const [subprocessMenu, setSubprocessMenu] = useState<{ activity: Activity; position: { x: number; y: number } } | null>(null)
  const [wizardActivity, setWizardActivity] = useState<Activity | null>(null)
  const [linkActivity, setLinkActivity] = useState<Activity | null>(null)
  const [viewportCenter, setViewportCenter] = useState({ x: 360, y: 260 })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [dataObjectActionError, setDataObjectActionError] = useState<string | null>(null)
  const [workflowViewMode, setWorkflowViewMode] = useState<WorkflowViewMode>('canvas')
  const [groupingMode, setGroupingMode] = useState<CanvasGroupingMode>(() => readDefaultGroupingMode())
  const [focusedCanvasNodeId, setFocusedCanvasNodeId] = useState<string | null>(null)

  const currentSnapshot = useMemo<CanvasSnapshot>(
    () => cloneSnapshot({ activities, canvasObjects, canvasEdges }),
    [activities, canvasObjects, canvasEdges],
  )

  useEffect(() => {
    latestSnapshotRef.current = currentSnapshot
  }, [currentSnapshot])

  useEffect(() => {
    seedInFlightRef.current = false
    isApplyingHistoryRef.current = false
    setUndoStack([])
    setRedoStack([])
    setOptimisticHiddenNodeIds([])
    setOptimisticHiddenEdgeIds([])
    setOptimisticActivities([])
    setOptimisticCanvasObjects([])
    setOptimisticEdges([])
    setEdgeAttributeOverrides({})
    setSelectedCanvasNodeId(null)
    setSelectedCanvasEdgeId(null)
    selectedCanvasNodeIdRef.current = null
    selectedCanvasEdgeIdRef.current = null
    setSubprocessMenu(null)
    setWizardActivity(null)
    setLinkActivity(null)
    pendingNodePositionRef.current = {}
  }, [workspaceId, parentActivityId])

  useEffect(() => {
    setOptimisticHiddenNodeIds((current) =>
      current.filter((id) => activities.some((activity) => activity.id === id) || canvasObjects.some((canvasObject) => canvasObject.id === id)),
    )
  }, [activities, canvasObjects])

  useEffect(() => {
    setOptimisticHiddenEdgeIds((current) => current.filter((id) => canvasEdges.some((edge) => edge.id === id)))
  }, [canvasEdges])

  useEffect(() => {
    setOptimisticActivities((current) =>
      current.filter((activity) => {
        const persisted = activities.find((entry) => entry.id === activity.id)
        if (!persisted) {
          return true
        }

        return (
          persisted.position_x !== activity.position_x ||
          persisted.position_y !== activity.position_y ||
          persisted.label !== activity.label ||
          persisted.description !== activity.description
        )
      }),
    )
  }, [activities])

  useEffect(() => {
    setOptimisticCanvasObjects((current) =>
      current.filter((canvasObject) => {
        const persisted = canvasObjects.find((entry) => entry.id === canvasObject.id)
        if (!persisted) {
          return true
        }

        if (persisted.object_type !== canvasObject.object_type) {
          return true
        }

        if (canvasObject.object_type === 'quelle') {
          const persistedSource = persisted as Extract<CanvasObject, { object_type: 'quelle' }>
          return (
            persistedSource.position_x !== canvasObject.position_x ||
            persistedSource.position_y !== canvasObject.position_y ||
            persistedSource.name !== canvasObject.name
          )
        }

        return (
          persisted.edge_id !== canvasObject.edge_id ||
          persisted.edge_sort_order !== canvasObject.edge_sort_order ||
          persisted.name !== canvasObject.name ||
          !areFieldsEqual(persisted.fields, canvasObject.fields)
        )
      }),
    )
  }, [canvasObjects])

  useEffect(() => {
    setOptimisticEdges((current) => current.filter((edge) => !canvasEdges.some((persisted) => persisted.id === edge.id)))
  }, [canvasEdges])

  useEffect(() => {
    if (activities.length > 0 && !selectedActivityId) {
      setSelectedActivityId(activities.find((activity) => activity.node_type === 'activity')?.id ?? activities[0].id)
    }
  }, [activities, selectedActivityId])

  useEffect(() => {
    const dataObjects = canvasObjects.filter((item) => item.object_type === 'datenobjekt')
    if (dataObjects.length > 0 && !selectedDataObjectId) {
      setSelectedDataObjectId(dataObjects[0].id)
    }
  }, [canvasObjects, selectedDataObjectId])

  const rememberSnapshot = useCallback(() => {
    if (isApplyingHistoryRef.current || activitiesLoading || objectsLoading) {
      return
    }

    setUndoStack((current) => [...current.slice(-49), cloneSnapshot(latestSnapshotRef.current)])
    setRedoStack([])
  }, [activitiesLoading, objectsLoading])

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId) ?? activities.find((activity) => activity.node_type === 'activity') ?? null,
    [activities, selectedActivityId],
  )

  const selectedObject = useMemo(
    () => canvasObjects.find((object) => object.id === selectedDataObjectId) ?? canvasObjects.find((object) => object.object_type === 'datenobjekt') ?? null,
    [canvasObjects, selectedDataObjectId],
  )

  const workspacesById = useMemo(() => new Map(workspaces.map((workspace) => [workspace.id, workspace])), [workspaces])

  const visibleActivities = useMemo(
    () => uniqueById([...activities, ...optimisticActivities]).filter((activity) => !optimisticHiddenNodeIds.includes(activity.id)),
    [activities, optimisticActivities, optimisticHiddenNodeIds],
  )

  const visibleCanvasObjects = useMemo(
    () => uniqueById([...canvasObjects, ...optimisticCanvasObjects]).filter((canvasObject) => !optimisticHiddenNodeIds.includes(canvasObject.id)),
    [canvasObjects, optimisticCanvasObjects, optimisticHiddenNodeIds],
  )
  const visibleSourceObjects = useMemo(
    () => visibleCanvasObjects.filter((canvasObject) => canvasObject.object_type === 'quelle'),
    [visibleCanvasObjects],
  )
  const visibleDataObjects = useMemo(
    () => visibleCanvasObjects.filter((canvasObject) => canvasObject.object_type === 'datenobjekt'),
    [visibleCanvasObjects],
  )

  const visibleCanvasEdges = useMemo(
    () =>
      uniqueById([...canvasEdges, ...optimisticEdges])
        .map((edge) => ({
          ...edge,
          label: edgeAttributeOverrides[edge.id]?.label ?? edge.label,
          transport_mode_id: edgeAttributeOverrides[edge.id]?.transport_mode_id ?? edge.transport_mode_id,
          transport_mode:
            transportModes.find(
              (mode) =>
                mode.id === (edgeAttributeOverrides[edge.id]?.transport_mode_id ?? edge.transport_mode_id),
            ) ?? edge.transport_mode,
          notes: edgeAttributeOverrides[edge.id]?.notes ?? edge.notes,
        }))
        .filter(
          (edge) =>
            !optimisticHiddenEdgeIds.includes(edge.id) &&
            !optimisticHiddenNodeIds.includes(edge.from_node_id) &&
            !optimisticHiddenNodeIds.includes(edge.to_node_id),
        ),
    [canvasEdges, edgeAttributeOverrides, optimisticEdges, optimisticHiddenEdgeIds, optimisticHiddenNodeIds, transportModes],
  )

  const hasStart = visibleActivities.some((activity) => activity.node_type === 'start_event')
  const hasEnd = visibleActivities.some((activity) => activity.node_type === 'end_event')
  const selectedEdge = useMemo(
    () => visibleCanvasEdges.find((edge) => edge.id === selectedCanvasEdgeId) ?? null,
    [selectedCanvasEdgeId, visibleCanvasEdges],
  )
  const selectedEdgeDataObjects = useMemo(
    () =>
      selectedEdge
        ? visibleDataObjects.filter((canvasObject) => canvasObject.edge_id === selectedEdge.id)
        : [],
    [selectedEdge, visibleDataObjects],
  )
  const selectedEdgeSourceActivity = useMemo(
    () =>
      selectedEdge?.from_node_type === 'activity'
        ? visibleActivities.find((activity) => activity.id === selectedEdge.from_node_id) ?? null
        : null,
    [selectedEdge, visibleActivities],
  )
  const selectedEdgeAllowsPathLabel = selectedEdgeSourceActivity?.node_type === 'gateway_decision'
  const selectedEdgeReusableDataObjects = useMemo(
    () => (selectedEdge ? getReusableDataObjectsForEdge(visibleCanvasObjects, selectedEdge.id) : []),
    [selectedEdge, visibleCanvasObjects],
  )
  const activityRolesById = useMemo(
    () =>
      Object.fromEntries(
        visibleActivities.map((activity) => [
          activity.id,
          organizationRoles.find((role) => role.id === activity.role_id)?.label ?? 'Nicht zugeordnet',
        ]),
      ),
    [organizationRoles, visibleActivities],
  )
  const activityAssigneesById = useMemo(
    () =>
      Object.fromEntries(
        visibleActivities.map((activity) => [
          activity.id,
          activity.assignee_label?.trim() || null,
        ]),
      ),
    [visibleActivities],
  )
  const sipocRows = useMemo(
    () => deriveWorkflowSipocRows(visibleActivities, visibleCanvasEdges, visibleCanvasObjects, activityRolesById),
    [activityRolesById, visibleActivities, visibleCanvasEdges, visibleCanvasObjects],
  )
  const canvasSearchOptions = useMemo<CanvasSearchOption[]>(
    () => [
      ...visibleActivities.map((activity) => ({
        id: activity.id,
        label: activity.label,
        kind:
          activity.node_type === 'gateway_decision' || activity.node_type === 'gateway_merge'
            ? ('gateway' as const)
            : ('activity' as const),
        subtitle:
          activity.node_type === 'gateway_decision'
            ? 'Entscheidung'
            : activity.node_type === 'gateway_merge'
              ? 'Zusammenfuehrung'
              : activityRolesById[activity.id] ?? 'Aktivitaet',
      })),
      ...visibleSourceObjects.map((canvasObject) => ({
        id: canvasObject.id,
        label: canvasObject.name,
        kind: 'source' as const,
        subtitle: 'Datenspeicher',
      })),
    ],
    [activityRolesById, visibleActivities, visibleSourceObjects],
  )
  const dataObjectToolbarHint = selectedEdge
      ? 'Datenobjekt auf markierter Verbindung einfügen'
      : 'Markiere zuerst die Verbindung, auf der das Objekt transportiert wird'

  async function renameActivityInline(activityId: string, nextLabel: string) {
    const activity = visibleActivities.find((entry) => entry.id === activityId)
    if (!activity || activity.label === nextLabel) {
      return
    }

    rememberSnapshot()
    setOptimisticActivities((current) => [
      ...current.filter((entry) => entry.id !== activityId),
      {
        ...activity,
        label: nextLabel,
      },
    ])

    try {
      await upsertActivity.mutateAsync({
        id: activity.id,
        parent_id: activity.parent_id,
        node_type: activity.node_type,
        label: nextLabel,
        trigger_type: activity.trigger_type,
        position_x: activity.position_x,
        position_y: activity.position_y,
        status: activity.status,
        status_icon: activity.status_icon,
        activity_type: activity.activity_type,
        description: activity.description,
        notes: activity.notes,
        assignee_label: activity.assignee_label ?? null,
        role_id: activity.role_id ?? null,
        duration_minutes: activity.duration_minutes ?? null,
        linked_workflow_id: activity.linked_workflow_id,
        linked_workflow_mode: activity.linked_workflow_mode,
        linked_workflow_purpose: activity.linked_workflow_purpose,
        linked_workflow_inputs: activity.linked_workflow_inputs,
        linked_workflow_outputs: activity.linked_workflow_outputs,
      })
    } catch (error) {
      setOptimisticActivities((current) => current.filter((entry) => entry.id !== activityId))
      throw error
    }
  }

  function canConnectActivityNodes(sourceId: string, targetId: string) {
    const sourceActivity = visibleActivities.find((activity) => activity.id === sourceId)
    const targetActivity = visibleActivities.find((activity) => activity.id === targetId)

    if (sourceActivity) {
      const outgoingCount = visibleCanvasEdges.filter(
        (edge) => edge.from_node_type === 'activity' && edge.from_node_id === sourceId,
      ).length

      if (sourceActivity.node_type === 'end_event') {
        return false
      }

      if (sourceActivity.node_type === 'gateway_merge' && outgoingCount >= 1) {
        return false
      }
    }

    if (targetActivity) {
      const incomingCount = visibleCanvasEdges.filter(
        (edge) => edge.to_node_type === 'activity' && edge.to_node_id === targetId,
      ).length

      if (targetActivity.node_type === 'start_event') {
        return false
      }

      if (targetActivity.node_type === 'gateway_decision' && incomingCount >= 1) {
        return false
      }
    }

    return true
  }

  function getViewportCenteredPosition(kind: keyof typeof DEFAULT_NODE_SIZES) {
    const size = DEFAULT_NODE_SIZES[kind]
    return {
      x: viewportCenter.x - size.width / 2,
      y: viewportCenter.y - size.height / 2,
    }
  }

  function getSmartInsertContext(nodeType: Activity['node_type']) {
    const currentSelectedEdgeId = selectedCanvasEdgeIdRef.current
    const currentSelectedNodeId = selectedCanvasNodeIdRef.current

    if (currentSelectedEdgeId || !currentSelectedNodeId) {
      return null
    }

    const selectedActivity = visibleActivities.find((activity) => activity.id === currentSelectedNodeId)
    if (!selectedActivity) {
      return null
    }

    const canInsertActivity =
      nodeType === 'activity' &&
      (selectedActivity.node_type === 'start_event' ||
        selectedActivity.node_type === 'activity' ||
        selectedActivity.node_type === 'gateway_decision')
    const canInsertDecision =
      nodeType === 'gateway_decision' &&
      (selectedActivity.node_type === 'activity' || selectedActivity.node_type === 'start_event')
    const canInsertMerge = nodeType === 'gateway_merge' && selectedActivity.node_type === 'activity'
    const canInsertEnd =
      nodeType === 'end_event' &&
      (selectedActivity.node_type === 'activity' || selectedActivity.node_type === 'gateway_merge')

    if (!canInsertActivity && !canInsertDecision && !canInsertMerge && !canInsertEnd) {
      return null
    }

    const selectedSize = DEFAULT_NODE_SIZES[selectedActivity.node_type]
    const targetSize = DEFAULT_NODE_SIZES[nodeType]
    const selectedCenterY = selectedActivity.position_y + selectedSize.height / 2
    const outgoingBranchCount =
      selectedActivity.node_type === 'gateway_decision' && nodeType === 'activity'
        ? visibleCanvasEdges.filter(
            (edge) => edge.from_node_type === 'activity' && edge.from_node_id === selectedActivity.id,
          ).length
        : 0

    return {
      sourceActivity: selectedActivity,
      position: {
        x: selectedActivity.position_x + selectedSize.width + SMART_INSERT_GAP,
        y: selectedCenterY - targetSize.height / 2 + outgoingBranchCount * (targetSize.height + 48),
      },
    }
  }

  useEffect(() => {
    if (parentActivityId !== null || activitiesLoading || objectsLoading || seedInFlightRef.current) {
      return
    }
    if (activities.length > 0 || canvasObjects.length > 0 || canvasEdges.length > 0) {
      return
    }

    seedInFlightRef.current = true

    void (async () => {
      try {
        const startActivity = await upsertActivity.mutateAsync({
          parent_id: null,
          node_type: 'start_event',
          label: 'Start',
          trigger_type: 'manual',
          position_x: 60,
          position_y: 240,
        })

        const demoActivity = await upsertActivity.mutateAsync({
          parent_id: null,
          node_type: 'activity',
          label: 'Neue Aktivität',
          position_x: 250,
          position_y: 210,
          description: 'Beschreibe den ersten fachlichen Schritt in diesem Ablauf.',
        })

        await upsertCanvasEdge.mutateAsync({
          parent_activity_id: null,
          from_node_type: 'activity',
          from_node_id: startActivity.id,
          from_handle_id: 'source-right',
          to_node_type: 'activity',
          to_node_id: demoActivity.id,
          to_handle_id: 'target-left',
          label: null,
          transport_mode_id: null,
          notes: null,
        })
      } catch {
        seedInFlightRef.current = false
      }
    })()
  }, [parentActivityId, activities, canvasObjects, canvasEdges, activitiesLoading, objectsLoading, upsertActivity, upsertCanvasEdge])

  const applySnapshot = useCallback(async (targetSnapshot: CanvasSnapshot) => {
    isApplyingHistoryRef.current = true

    try {
      const current = latestSnapshotRef.current
      const targetActivityIds = new Set(targetSnapshot.activities.map((activity) => activity.id))
      const targetObjectIds = new Set(targetSnapshot.canvasObjects.map((canvasObject) => canvasObject.id))
      const targetEdgeIds = new Set(targetSnapshot.canvasEdges.map((edge) => edge.id))

      for (const edge of current.canvasEdges.filter((item) => !targetEdgeIds.has(item.id))) {
        await deleteCanvasEdge.mutateAsync(edge.id)
      }

      for (const canvasObject of current.canvasObjects.filter((item) => !targetObjectIds.has(item.id))) {
        await deleteCanvasObject.mutateAsync(canvasObject.id)
      }

      for (const activity of current.activities.filter((item) => !targetActivityIds.has(item.id))) {
        await deleteActivity.mutateAsync(activity.id)
      }

      for (const activity of targetSnapshot.activities) {
        await upsertActivity.mutateAsync({
          id: activity.id,
          parent_id: activity.parent_id,
          node_type: activity.node_type,
          label: activity.label,
          trigger_type: activity.trigger_type,
          position_x: activity.position_x,
          position_y: activity.position_y,
          status: activity.status,
          status_icon: activity.status_icon,
          activity_type: activity.activity_type,
          description: activity.description,
          notes: activity.notes,
          duration_minutes: activity.duration_minutes,
        })
      }

      for (const canvasObject of targetSnapshot.canvasObjects) {
        await upsertCanvasObject.mutateAsync({
          id: canvasObject.id,
          parent_activity_id: canvasObject.parent_activity_id,
          object_type: canvasObject.object_type,
          name: canvasObject.name,
          edge_id: canvasObject.object_type === 'datenobjekt' ? canvasObject.edge_id : null,
          edge_sort_order: canvasObject.object_type === 'datenobjekt' ? canvasObject.edge_sort_order : null,
          position_x: canvasObject.object_type === 'quelle' ? canvasObject.position_x : undefined,
          position_y: canvasObject.object_type === 'quelle' ? canvasObject.position_y : undefined,
          fields: canvasObject.object_type === 'datenobjekt'
            ? (canvasObject.fields ?? []).map((field, index) => ({
                id: field.id,
                name: field.name,
                field_type: field.field_type,
                required: field.required,
                sort_order: index,
              }))
            : undefined,
        })
      }

      for (const edge of targetSnapshot.canvasEdges) {
        await upsertCanvasEdge.mutateAsync({
          id: edge.id,
          parent_activity_id: edge.parent_activity_id,
          from_node_type: edge.from_node_type,
          from_node_id: edge.from_node_id,
          from_handle_id: edge.from_handle_id,
          to_node_type: edge.to_node_type,
          to_node_id: edge.to_node_id,
          to_handle_id: edge.to_handle_id,
          label: edge.label,
          transport_mode_id: edge.transport_mode_id,
          notes: edge.notes,
        })
      }
    } finally {
      isApplyingHistoryRef.current = false
    }
  }, [deleteActivity, deleteCanvasEdge, deleteCanvasObject, upsertActivity, upsertCanvasEdge, upsertCanvasObject])

  const undo = useCallback(async () => {
    const previous = undoStack[undoStack.length - 1]
    if (!previous || isApplyingHistoryRef.current) {
      return
    }

    const current = cloneSnapshot(latestSnapshotRef.current)
    setUndoStack((items) => items.slice(0, -1))
    setRedoStack((items) => [...items, current])
    await applySnapshot(previous)
  }, [applySnapshot, undoStack])

  const redo = useCallback(async () => {
    const next = redoStack[redoStack.length - 1]
    if (!next || isApplyingHistoryRef.current) {
      return
    }

    const current = cloneSnapshot(latestSnapshotRef.current)
    setRedoStack((items) => items.slice(0, -1))
    setUndoStack((items) => [...items, current])
    await applySnapshot(next)
  }, [applySnapshot, redoStack])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const metaOrCtrl = event.metaKey || event.ctrlKey
      if (!metaOrCtrl || event.altKey) {
        return
      }

      const key = event.key.toLowerCase()
      if (key !== 'z') {
        return
      }

      event.preventDefault()
      if (event.shiftKey) {
        void redo()
        return
      }
      void undo()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [redo, undo])

  async function signOut() {
    await supabase?.auth.signOut()
    leaveWorkspace()
  }

  function openLinkedSubprocess(activity: Activity) {
    if (!activity.linked_workflow_id) {
      return
    }

    const linkedWorkspace = workspacesById.get(activity.linked_workflow_id)
    if (!linkedWorkspace) {
      return
    }

    openSubprocessWorkspace(linkedWorkspace.id, linkedWorkspace.name, activity.id, activity.label)
    setSubprocessMenu(null)
  }

  async function handleCreateSubprocess(input: {
    name: string
    goal: string
    expected_inputs: string[]
    expected_outputs: string[]
    steps: string[]
  }) {
    if (!wizardActivity) {
      return
    }

    const result = await createSubprocess.mutateAsync({
      activityId: wizardActivity.id,
      input,
    })

    setWizardActivity(null)
    setSubprocessMenu(null)
    openSubprocessWorkspace(result.workspace.id, result.workspace.name, wizardActivity.id, wizardActivity.label)
  }

  async function handleLinkExistingSubprocess(input: {
    linked_workflow_id: string
    linked_workflow_mode?: 'detail' | 'reference' | null
    linked_workflow_purpose?: string | null
    linked_workflow_inputs?: string[]
    linked_workflow_outputs?: string[]
  }) {
    if (!linkActivity) {
      return
    }

    await linkSubprocess.mutateAsync({
      activityId: linkActivity.id,
      input,
    })

    const linkedWorkspace = workspacesById.get(input.linked_workflow_id)
    setLinkActivity(null)
    setSubprocessMenu(null)
    if (linkedWorkspace) {
      openSubprocessWorkspace(linkedWorkspace.id, linkedWorkspace.name, linkActivity.id, linkActivity.label)
    }
  }

  async function handleUnlinkSubprocess(activity: Activity) {
    await unlinkSubprocess.mutateAsync(activity.id)
    setSubprocessMenu(null)
  }

  async function insertActivity(nodeType: Activity['node_type'], options?: { position?: { x: number; y: number }; allowSmartInsert?: boolean }) {
    rememberSnapshot()
    const smartInsert = options?.allowSmartInsert === false ? null : getSmartInsertContext(nodeType)
    const position = options?.position ?? smartInsert?.position ?? getViewportCenteredPosition(nodeType)
    const optimisticActivityId = crypto.randomUUID()
    const optimisticActivity: Activity = {
      id: optimisticActivityId,
      workspace_id: workspaceId,
      parent_id: parentActivityId,
      owner_id: '',
      node_type: nodeType,
      label: getDefaultActivityLabel(nodeType),
      trigger_type: nodeType === 'start_event' ? 'manual' : null,
      position_x: position.x,
      position_y: position.y,
      status: 'draft',
      status_icon: null,
      activity_type: 'unbestimmt',
      description: getDefaultActivityDescription(nodeType),
      notes: null,
      duration_minutes: null,
      linked_workflow_id: null,
      linked_workflow_mode: null,
      linked_workflow_purpose: null,
      linked_workflow_inputs: [],
      linked_workflow_outputs: [],
      updated_at: new Date().toISOString(),
    }

    setOptimisticActivities((current) => [...current, optimisticActivity])
    setSelectedActivityId(optimisticActivityId)
    setSelectedCanvasNodeId(optimisticActivityId)
    setSelectedCanvasEdgeId(null)
    selectedCanvasNodeIdRef.current = optimisticActivityId
    selectedCanvasEdgeIdRef.current = null

    const optimisticEdgeId = smartInsert ? crypto.randomUUID() : null
    if (smartInsert && optimisticEdgeId) {
      setOptimisticEdges((current) => [
        ...current,
        {
          id: optimisticEdgeId,
          workspace_id: workspaceId,
          parent_activity_id: parentActivityId,
          from_node_type: 'activity',
          from_node_id: smartInsert.sourceActivity.id,
          from_handle_id: 'source-right',
          to_node_type: 'activity',
          to_node_id: optimisticActivityId,
          to_handle_id: 'target-left',
          label: null,
          transport_mode_id: null,
          transport_mode: null,
          notes: null,
        },
      ])
    }

    try {
      const createdActivity = await upsertActivity.mutateAsync({
        id: optimisticActivityId,
        parent_id: parentActivityId,
        node_type: nodeType,
        label: optimisticActivity.label,
        trigger_type: optimisticActivity.trigger_type,
        position_x: position.x,
        position_y: position.y,
        description: optimisticActivity.description,
      })

      const pendingPosition = pendingNodePositionRef.current[optimisticActivityId]
      delete pendingNodePositionRef.current[optimisticActivityId]
      const resolvedActivity = pendingPosition
        ? {
            ...createdActivity,
            position_x: pendingPosition.x,
            position_y: pendingPosition.y,
          }
        : createdActivity

      setOptimisticActivities((current) => current.map((activity) => (activity.id === optimisticActivityId ? resolvedActivity : activity)))
      setSelectedActivityId(resolvedActivity.id)
      setSelectedCanvasNodeId(resolvedActivity.id)
      selectedCanvasNodeIdRef.current = resolvedActivity.id

      if (pendingPosition) {
        await upsertActivity.mutateAsync({
          id: createdActivity.id,
          parent_id: createdActivity.parent_id,
          node_type: createdActivity.node_type,
          label: createdActivity.label,
          trigger_type: createdActivity.trigger_type,
          position_x: pendingPosition.x,
          position_y: pendingPosition.y,
          status: createdActivity.status,
          status_icon: createdActivity.status_icon,
          activity_type: createdActivity.activity_type,
          description: createdActivity.description,
          notes: createdActivity.notes,
          duration_minutes: createdActivity.duration_minutes,
        })
      }

      if (smartInsert && optimisticEdgeId) {
        const createdEdge = await upsertCanvasEdge.mutateAsync({
          id: optimisticEdgeId,
          parent_activity_id: parentActivityId,
          from_node_type: 'activity',
          from_node_id: smartInsert.sourceActivity.id,
          from_handle_id: 'source-right',
          to_node_type: 'activity',
          to_node_id: createdActivity.id,
          to_handle_id: 'target-left',
          label: null,
          transport_mode_id: null,
          notes: null,
        })

        setOptimisticEdges((current) => current.map((edge) => (edge.id === optimisticEdgeId ? createdEdge : edge)))
      }
    } catch (error) {
      delete pendingNodePositionRef.current[optimisticActivityId]
      setOptimisticActivities((current) => current.filter((activity) => activity.id !== optimisticActivityId))
      if (optimisticEdgeId) {
        setOptimisticEdges((current) => current.filter((edge) => edge.id !== optimisticEdgeId))
      }
      setSelectedActivityId((current) => (current === optimisticActivityId ? null : current))
      setSelectedCanvasNodeId((current) => (current === optimisticActivityId ? null : current))
      selectedCanvasNodeIdRef.current = null
      throw error
    }
  }

  async function createEdgeDataObject(edgeId: string, template?: EdgeDataObject) {
    const targetEdge = visibleCanvasEdges.find((edge) => edge.id === edgeId)
    if (!targetEdge) {
      return undefined
    }

    rememberSnapshot()
    const optimisticObjectId = crypto.randomUUID()
    const nextSortOrder =
      visibleDataObjects
        .filter((canvasObject) => canvasObject.edge_id === edgeId)
        .reduce((highest, canvasObject) => Math.max(highest, canvasObject.edge_sort_order), -1) + 1

    const optimisticObject: EdgeDataObject = {
      id: optimisticObjectId,
      workspace_id: workspaceId,
      parent_activity_id: parentActivityId,
      object_type: 'datenobjekt',
      name: template?.name ?? `Datenobjekt ${nextSortOrder + 1}`,
      edge_id: edgeId,
      edge_sort_order: nextSortOrder,
      updated_at: new Date().toISOString(),
      fields:
        template?.fields?.map((field, index) => ({
          ...field,
          id: crypto.randomUUID(),
          object_id: optimisticObjectId,
          sort_order: index,
        })) ?? [],
    }

    setOptimisticCanvasObjects((current) => [...current, optimisticObject])
    setSelectedDataObjectId(null)
    setSelectedCanvasNodeId(null)
    setSelectedCanvasEdgeId(edgeId)
    selectedCanvasNodeIdRef.current = null
    selectedCanvasEdgeIdRef.current = edgeId

    try {
      const createdObject = await upsertCanvasObject.mutateAsync({
        id: optimisticObjectId,
        parent_activity_id: parentActivityId,
        object_type: 'datenobjekt',
        name: optimisticObject.name,
        edge_id: edgeId,
        edge_sort_order: nextSortOrder,
        fields: (optimisticObject.fields ?? []).map((field, index) => ({
          name: field.name,
          field_type: field.field_type,
          required: field.required,
          sort_order: index,
        })),
      })

      setOptimisticCanvasObjects((current) => current.map((canvasObject) => (canvasObject.id === optimisticObjectId ? createdObject : canvasObject)))
      return optimisticObject
    } catch (error) {
      setOptimisticCanvasObjects((current) => current.filter((canvasObject) => canvasObject.id !== optimisticObjectId))
      throw error
    }
  }

  async function addExistingDataObjectToEdge(edgeId: string, dataObjectId: string) {
    const template = visibleDataObjects.find((canvasObject) => canvasObject.id === dataObjectId)
    if (!template) {
      return
    }

    await createEdgeDataObject(edgeId, template)
  }

  async function insertCanvasObject(objectType: CanvasObject['object_type'], options?: { position?: { x: number; y: number } }) {
    const currentSelectedEdge = visibleCanvasEdges.find((edge) => edge.id === selectedCanvasEdgeIdRef.current) ?? null

    if (objectType === 'datenobjekt') {
      if (!currentSelectedEdge) {
        return
      }
      await createEdgeDataObject(currentSelectedEdge.id)
      return
    }

    rememberSnapshot()
    const position = options?.position ?? getViewportCenteredPosition(objectType)
    const optimisticObjectId = crypto.randomUUID()
    const optimisticObject: CanvasObject = {
      id: optimisticObjectId,
      workspace_id: workspaceId,
      parent_activity_id: parentActivityId,
      object_type: objectType,
      name: 'Neuer Datenspeicher',
      position_x: position.x,
      position_y: position.y,
      edge_id: null,
      edge_sort_order: null,
      updated_at: new Date().toISOString(),
    }

    setOptimisticCanvasObjects((current) => [...current, optimisticObject])
    setSelectedCanvasNodeId(optimisticObjectId)
    setSelectedCanvasEdgeId(null)
    selectedCanvasNodeIdRef.current = optimisticObjectId
    selectedCanvasEdgeIdRef.current = null

    try {
      const createdObject = await upsertCanvasObject.mutateAsync({
        id: optimisticObjectId,
        parent_activity_id: parentActivityId,
        object_type: objectType,
        name: optimisticObject.name,
        position_x: position.x,
        position_y: position.y,
      })

      const pendingPosition = pendingNodePositionRef.current[optimisticObjectId]
      delete pendingNodePositionRef.current[optimisticObjectId]
      const resolvedObject: Extract<CanvasObject, { object_type: 'quelle' }> = pendingPosition
        ? {
            ...(createdObject as Extract<CanvasObject, { object_type: 'quelle' }>),
            position_x: pendingPosition.x,
            position_y: pendingPosition.y,
          }
        : (createdObject as Extract<CanvasObject, { object_type: 'quelle' }>)

      setOptimisticCanvasObjects((current) => current.map((canvasObject) => (canvasObject.id === optimisticObjectId ? resolvedObject : canvasObject)))
      setSelectedCanvasNodeId(resolvedObject.id)
      selectedCanvasNodeIdRef.current = resolvedObject.id

      if (pendingPosition) {
        await upsertCanvasObject.mutateAsync({
          id: createdObject.id,
          parent_activity_id: createdObject.parent_activity_id,
          object_type: createdObject.object_type,
          name: createdObject.name,
          position_x: pendingPosition.x,
          position_y: pendingPosition.y,
        })
      }
    } catch (error) {
      delete pendingNodePositionRef.current[optimisticObjectId]
      setOptimisticCanvasObjects((current) => current.filter((canvasObject) => canvasObject.id !== optimisticObjectId))
      setSelectedCanvasNodeId((current) => (current === optimisticObjectId ? null : current))
      selectedCanvasNodeIdRef.current = null
      throw error
    }
  }

  async function connectCanvasNodes(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return
    }

    if (!canConnectActivityNodes(connection.source, connection.target)) {
      return
    }

    const alreadyExists = [...canvasEdges, ...optimisticEdges].some(
      (edge) =>
        edge.from_node_id === connection.source &&
        edge.to_node_id === connection.target &&
        (edge.from_handle_id ?? null) === (connection.sourceHandle ?? null) &&
        (edge.to_handle_id ?? null) === (connection.targetHandle ?? null),
    )
    if (alreadyExists) {
      return
    }

    rememberSnapshot()

    const sourceIsCanvasObject = visibleSourceObjects.some((object) => object.id === connection.source)
    const targetIsCanvasObject = visibleSourceObjects.some((object) => object.id === connection.target)
    const optimisticEdgeId = crypto.randomUUID()

    const optimisticEdge: CanvasEdge = {
      id: optimisticEdgeId,
      workspace_id: workspaceId,
      parent_activity_id: parentActivityId,
      from_node_type: sourceIsCanvasObject ? 'canvas_object' : 'activity',
      from_node_id: connection.source,
      from_handle_id: connection.sourceHandle ?? null,
      to_node_type: targetIsCanvasObject ? 'canvas_object' : 'activity',
      to_node_id: connection.target,
      to_handle_id: connection.targetHandle ?? null,
      label: null,
      transport_mode_id: null,
      transport_mode: null,
      notes: null,
    }

    setOptimisticEdges((current) => [...current, optimisticEdge])

    try {
      const createdEdge = await upsertCanvasEdge.mutateAsync({
        id: optimisticEdgeId,
        parent_activity_id: parentActivityId,
        from_node_type: sourceIsCanvasObject ? 'canvas_object' : 'activity',
        from_node_id: connection.source,
        from_handle_id: connection.sourceHandle ?? null,
        to_node_type: targetIsCanvasObject ? 'canvas_object' : 'activity',
        to_node_id: connection.target,
        to_handle_id: connection.targetHandle ?? null,
        label: null,
        transport_mode_id: null,
        notes: null,
      })

      setOptimisticEdges((current) => current.map((edge) => (edge.id === optimisticEdgeId ? createdEdge : edge)))
    } catch (error) {
      setOptimisticEdges((current) => current.filter((edge) => edge.id !== optimisticEdgeId))
      throw error
    }
  }

  async function createActivityFromConnectionDrop(input: { sourceNodeId: string; sourceHandleId: string | null; position: { x: number; y: number } }) {
    rememberSnapshot()
    const targetHandleId = getOppositeTargetHandleId(input.sourceHandleId)
    const nodePosition = getNewActivityPositionForDrop(input.position, targetHandleId)
    const optimisticActivityId = crypto.randomUUID()
    const optimisticEdgeId = crypto.randomUUID()
    const sourceIsCanvasObject = visibleSourceObjects.some((object) => object.id === input.sourceNodeId)

    const optimisticActivity: Activity = {
      id: optimisticActivityId,
      workspace_id: workspaceId,
      parent_id: parentActivityId,
      owner_id: '',
      node_type: 'activity',
      label: 'Neue Aktivität',
      trigger_type: null,
      position_x: nodePosition.x,
      position_y: nodePosition.y,
      status: 'draft',
      status_icon: null,
      activity_type: 'unbestimmt',
      description: 'Beschreibe den nächsten fachlichen Schritt in diesem Ablauf.',
      notes: null,
      duration_minutes: null,
      linked_workflow_id: null,
      linked_workflow_mode: null,
      linked_workflow_purpose: null,
      linked_workflow_inputs: [],
      linked_workflow_outputs: [],
      updated_at: new Date().toISOString(),
    }

    const optimisticEdge: CanvasEdge = {
      id: optimisticEdgeId,
      workspace_id: workspaceId,
      parent_activity_id: parentActivityId,
      from_node_type: sourceIsCanvasObject ? 'canvas_object' : 'activity',
      from_node_id: input.sourceNodeId,
      from_handle_id: input.sourceHandleId,
      to_node_type: 'activity',
      to_node_id: optimisticActivityId,
      to_handle_id: targetHandleId,
      label: null,
      transport_mode_id: null,
      transport_mode: null,
      notes: null,
    }

    setOptimisticActivities((current) => [...current, optimisticActivity])
    setOptimisticEdges((current) => [...current, optimisticEdge])
    setSelectedActivityId(optimisticActivityId)

    try {
      const createdActivity = await upsertActivity.mutateAsync({
        id: optimisticActivityId,
        parent_id: parentActivityId,
        node_type: 'activity',
        label: 'Neue Aktivität',
        position_x: nodePosition.x,
        position_y: nodePosition.y,
        description: 'Beschreibe den nächsten fachlichen Schritt in diesem Ablauf.',
      })

      setOptimisticActivities((current) => current.map((activity) => (activity.id === optimisticActivityId ? createdActivity : activity)))
      setSelectedActivityId(createdActivity.id)
      setOptimisticEdges((current) =>
        current.map((edge) =>
          edge.id === optimisticEdgeId
            ? {
                ...edge,
                to_node_id: createdActivity.id,
              }
            : edge,
        ),
      )

      const createdEdge = await upsertCanvasEdge.mutateAsync({
        id: optimisticEdgeId,
        parent_activity_id: parentActivityId,
        from_node_type: sourceIsCanvasObject ? 'canvas_object' : 'activity',
        from_node_id: input.sourceNodeId,
        from_handle_id: input.sourceHandleId,
        to_node_type: 'activity',
        to_node_id: createdActivity.id,
        to_handle_id: targetHandleId,
        label: null,
        transport_mode_id: null,
        notes: null,
      })

      setOptimisticEdges((current) => current.map((edge) => (edge.id === optimisticEdgeId ? createdEdge : edge)))
    } catch (error) {
      setOptimisticActivities((current) => current.filter((activity) => activity.id !== optimisticActivityId))
      setOptimisticEdges((current) => current.filter((edge) => edge.id !== optimisticEdgeId))
      setSelectedActivityId((current) => (current === optimisticActivityId ? null : current))
      throw error
    }
  }

  async function persistNodePosition(nodeId: string, position: { x: number; y: number }) {
    const optimisticActivity = optimisticActivities.find((entry) => entry.id === nodeId)
    if (optimisticActivity) {
      pendingNodePositionRef.current[nodeId] = position
      setOptimisticActivities((current) =>
        current.map((activity) =>
          activity.id === nodeId
            ? {
                ...activity,
                position_x: position.x,
                position_y: position.y,
              }
            : activity,
        ),
      )
      return
    }

    const activity = activities.find((entry) => entry.id === nodeId)
    if (activity) {
      if (activity.position_x === position.x && activity.position_y === position.y) {
        return
      }

      rememberSnapshot()
      await upsertActivity.mutateAsync({
        id: activity.id,
        parent_id: activity.parent_id,
        node_type: activity.node_type,
        label: activity.label,
        trigger_type: activity.trigger_type,
        position_x: position.x,
        position_y: position.y,
        status: activity.status,
        status_icon: activity.status_icon,
        activity_type: activity.activity_type,
        description: activity.description,
        notes: activity.notes,
        duration_minutes: activity.duration_minutes,
      })
      return
    }

    const optimisticCanvasObject = optimisticCanvasObjects.find((entry) => entry.id === nodeId)
    if (optimisticCanvasObject?.object_type === 'quelle') {
      pendingNodePositionRef.current[nodeId] = position
      setOptimisticCanvasObjects((current) =>
        current.map((canvasObject) =>
          canvasObject.id === nodeId
            ? {
                ...canvasObject,
                position_x: position.x,
                position_y: position.y,
              }
            : canvasObject,
        ),
      )
      return
    }

    const canvasObject = canvasObjects.find((entry) => entry.id === nodeId && entry.object_type === 'quelle')
    if (!canvasObject || canvasObject.object_type !== 'quelle') {
      return
    }
    if (canvasObject.position_x === position.x && canvasObject.position_y === position.y) {
      return
    }

    rememberSnapshot()
    await upsertCanvasObject.mutateAsync({
      id: canvasObject.id,
      parent_activity_id: canvasObject.parent_activity_id,
      object_type: canvasObject.object_type,
      name: canvasObject.name,
      position_x: position.x,
      position_y: position.y,
    })
  }

  async function updateEdge(edgeId: string, input: { label?: string | null; transport_mode_id?: string | null; notes?: string | null }) {
    const edge = visibleCanvasEdges.find((item) => item.id === edgeId)
    if (!edge) {
      return
    }

    rememberSnapshot()
    const nextLabel = input.label ?? edge.label
    const nextTransportModeId = input.transport_mode_id ?? edge.transport_mode_id
    const nextNotes = input.notes ?? edge.notes
    setEdgeAttributeOverrides((current) => ({
      ...current,
      [edgeId]: {
        label: nextLabel,
        transport_mode_id: nextTransportModeId,
        notes: nextNotes,
      },
    }))

    await upsertCanvasEdge.mutateAsync({
      id: edge.id,
      parent_activity_id: edge.parent_activity_id,
      from_node_type: edge.from_node_type,
      from_node_id: edge.from_node_id,
      from_handle_id: edge.from_handle_id,
      to_node_type: edge.to_node_type,
      to_node_id: edge.to_node_id,
      to_handle_id: edge.to_handle_id,
      label: nextLabel,
      transport_mode_id: nextTransportModeId,
      notes: nextNotes,
    })
  }

  async function removeEdges(edgeIds: string[]) {
    if (edgeIds.length === 0) {
      return
    }

    rememberSnapshot()
    const attachedDataObjectIds = visibleDataObjects
      .filter((canvasObject) => edgeIds.includes(canvasObject.edge_id))
      .map((canvasObject) => canvasObject.id)

    setOptimisticHiddenNodeIds((current) => [...new Set([...current, ...attachedDataObjectIds])])
    setOptimisticHiddenEdgeIds((current) => [...new Set([...current, ...edgeIds])])
    try {
      await Promise.all(edgeIds.map((edgeId) => deleteCanvasEdge.mutateAsync(edgeId)))
      setSelectedCanvasEdgeId((current) => (current && edgeIds.includes(current) ? null : current))
      setSelectedDataObjectId((current) => (current && attachedDataObjectIds.includes(current) ? null : current))
      if (selectedDataObjectId && attachedDataObjectIds.includes(selectedDataObjectId)) {
        setIsDataObjectPopupOpen(false)
      }
      if (selectedCanvasEdgeIdRef.current && edgeIds.includes(selectedCanvasEdgeIdRef.current)) {
        selectedCanvasEdgeIdRef.current = null
      }
    } catch (error) {
      setOptimisticHiddenNodeIds((current) => current.filter((id) => !attachedDataObjectIds.includes(id)))
      setOptimisticHiddenEdgeIds((current) => current.filter((id) => !edgeIds.includes(id)))
      throw error
    }
  }

  async function removeDataObject(dataObjectId: string) {
    const canvasObject = visibleDataObjects.find((entry) => entry.id === dataObjectId)
    if (!canvasObject) {
      return
    }

    rememberSnapshot()
    setOptimisticHiddenNodeIds((current) => [...new Set([...current, dataObjectId])])

    try {
      await deleteCanvasObject.mutateAsync(dataObjectId)
      setSelectedDataObjectId((current) => (current === dataObjectId ? null : current))
      setIsDataObjectPopupOpen(false)
    } catch (error) {
      setOptimisticHiddenNodeIds((current) => current.filter((id) => id !== dataObjectId))
      throw error
    }
  }

  async function saveCanvasObjectDetails(input: UpsertCanvasObjectInput) {
    const canvasObject = visibleCanvasObjects.find((entry) => entry.id === input.id)
    if (!canvasObject) {
      return
    }

    rememberSnapshot()
    setDataObjectActionError(null)

    const nextObject: CanvasObject =
      canvasObject.object_type === 'quelle'
        ? {
            ...canvasObject,
            name: input.name,
            position_x: input.position_x ?? canvasObject.position_x,
            position_y: input.position_y ?? canvasObject.position_y,
          }
        : {
            ...canvasObject,
            name: input.name,
            edge_id: input.edge_id ?? canvasObject.edge_id,
            edge_sort_order: input.edge_sort_order ?? canvasObject.edge_sort_order,
            fields: (input.fields ?? []).map((field, index) => ({
              id: field.id,
              object_id: canvasObject.id,
              name: field.name,
              field_type: field.field_type,
              required: field.required,
              sort_order: index,
            })),
          }

    setOptimisticCanvasObjects((current) => [...current.filter((item) => item.id !== canvasObject.id), nextObject])

    try {
      await upsertCanvasObject.mutateAsync(input)
    } catch (error) {
      setOptimisticCanvasObjects((current) => current.filter((item) => item.id !== canvasObject.id))
      setDataObjectActionError(
        canvasObject.object_type === 'datenobjekt'
          ? 'Datenobjekt konnte nicht gespeichert werden.'
          : 'Datenspeicher konnte nicht gespeichert werden.',
      )
      throw error
    }
  }

  async function deleteCanvasObjectFromDialog(canvasObjectId: string) {
    const canvasObject = visibleCanvasObjects.find((entry) => entry.id === canvasObjectId)
    if (!canvasObject) {
      return
    }

    rememberSnapshot()
    setDataObjectActionError(null)
    setOptimisticHiddenNodeIds((current) => [...new Set([...current, canvasObjectId])])
    setSelectedDataObjectId((current) => (current === canvasObjectId ? null : current))

    try {
      await deleteCanvasObject.mutateAsync(canvasObjectId)
    } catch (error) {
      setOptimisticHiddenNodeIds((current) => current.filter((id) => id !== canvasObjectId))
      setDataObjectActionError(
        canvasObject.object_type === 'datenobjekt'
          ? 'Datenobjekt konnte nicht gelöscht werden.'
          : 'Datenspeicher konnte nicht gelöscht werden.',
      )
      throw error
    }
  }

  async function renameEdgeDataObject(dataObjectId: string, name: string) {
    const canvasObject = visibleDataObjects.find((entry) => entry.id === dataObjectId)
    const trimmedName = name.trim()
    if (!canvasObject || !trimmedName || canvasObject.name === trimmedName) {
      return
    }

    rememberSnapshot()
    const nextObject: EdgeDataObject = {
      ...canvasObject,
      name: trimmedName,
    }

    setOptimisticCanvasObjects((current) => [...current.filter((item) => item.id !== dataObjectId), nextObject])

    try {
      await upsertCanvasObject.mutateAsync({
        id: canvasObject.id,
        parent_activity_id: canvasObject.parent_activity_id,
        object_type: canvasObject.object_type,
        name: trimmedName,
        edge_id: canvasObject.edge_id,
        edge_sort_order: canvasObject.edge_sort_order,
        fields: (canvasObject.fields ?? []).map((field, index) => ({
          id: field.id,
          name: field.name,
          field_type: field.field_type,
          required: field.required,
          sort_order: index,
        })),
      })
    } catch (error) {
      setOptimisticCanvasObjects((current) => current.filter((item) => item.id !== dataObjectId))
      throw error
    }
  }

  async function removeActivity(activity: Activity) {
    rememberSnapshot()
    const connectedEdgeIds = canvasEdges
      .filter((edge) => edge.from_node_id === activity.id || edge.to_node_id === activity.id)
      .map((edge) => edge.id)

    setOptimisticHiddenNodeIds((current) => [...new Set([...current, activity.id])])
    setOptimisticHiddenEdgeIds((current) => [...new Set([...current, ...connectedEdgeIds])])

    try {
      await Promise.all([
        ...connectedEdgeIds.map((edgeId) => deleteCanvasEdge.mutateAsync(edgeId)),
        deleteActivity.mutateAsync(activity.id),
      ])
      setIsActivityPopupOpen(false)
      setSelectedActivityId(activities.find((item) => item.id !== activity.id)?.id ?? null)
      setSelectedCanvasNodeId((current) => (current === activity.id ? null : current))
      if (selectedCanvasNodeIdRef.current === activity.id) {
        selectedCanvasNodeIdRef.current = null
      }
    } catch (error) {
      setOptimisticHiddenNodeIds((current) => current.filter((id) => id !== activity.id))
      setOptimisticHiddenEdgeIds((current) => current.filter((id) => !connectedEdgeIds.includes(id)))
      throw error
    }
  }

  async function removeSelection(selection: { nodeIds: string[]; edgeIds: string[] }) {
    if (selection.nodeIds.length === 0 && selection.edgeIds.length === 0) {
      return
    }

    const selectedActivities = activities.filter((activity) => selection.nodeIds.includes(activity.id))
    const selectedObjects = canvasObjects.filter((canvasObject) => selection.nodeIds.includes(canvasObject.id))

    rememberSnapshot()

    const connectedEdgeIds = canvasEdges
      .filter((edge) => selection.nodeIds.includes(edge.from_node_id) || selection.nodeIds.includes(edge.to_node_id))
      .map((edge) => edge.id)

    const hiddenEdgeIds = [...new Set([...selection.edgeIds, ...connectedEdgeIds])]

    setOptimisticHiddenNodeIds((current) => [...new Set([...current, ...selection.nodeIds])])
    setOptimisticHiddenEdgeIds((current) => [...new Set([...current, ...hiddenEdgeIds])])

    try {
      await Promise.all([
        ...hiddenEdgeIds.map((edgeId) => deleteCanvasEdge.mutateAsync(edgeId)),
        ...selectedObjects.map((canvasObject) => deleteCanvasObject.mutateAsync(canvasObject.id)),
        ...selectedActivities.map((activity) => deleteActivity.mutateAsync(activity.id)),
      ])

      if (selectedActivityId && selection.nodeIds.includes(selectedActivityId)) {
        setSelectedActivityId(activities.find((item) => !selection.nodeIds.includes(item.id))?.id ?? null)
        setIsActivityPopupOpen(false)
      }
      if (selectedDataObjectId && selection.nodeIds.includes(selectedDataObjectId)) {
        setSelectedDataObjectId(canvasObjects.find((item) => !selection.nodeIds.includes(item.id))?.id ?? null)
        setIsDataObjectPopupOpen(false)
      }
      if (selectedCanvasNodeId && selection.nodeIds.includes(selectedCanvasNodeId)) {
        setSelectedCanvasNodeId(null)
        selectedCanvasNodeIdRef.current = null
      }
      if (selectedCanvasEdgeId && hiddenEdgeIds.includes(selectedCanvasEdgeId)) {
        setSelectedCanvasEdgeId(null)
        selectedCanvasEdgeIdRef.current = null
      }
    } catch (error) {
      setOptimisticHiddenNodeIds((current) => current.filter((id) => !selection.nodeIds.includes(id)))
      setOptimisticHiddenEdgeIds((current) => current.filter((id) => !hiddenEdgeIds.includes(id)))
      throw error
    }
  }

  async function exportAsPng() {
    const canvasElement = document.querySelector('[data-testid="workflow-canvas"]') as HTMLElement | null
    if (!canvasElement) {
      return
    }

    const dataUrl = await toPng(canvasElement, {
      cacheBust: true,
      backgroundColor: '#08121b',
      pixelRatio: 2,
    })
    const link = document.createElement('a')
    const fileDate = new Date().toISOString().slice(0, 10)
    link.download = `${workspaceName}-${fileDate}.png`
    link.href = dataUrl
    link.click()
  }

  function exportAsPdf() {
    window.print()
  }

  return (
    <div className="h-screen w-full overflow-hidden px-4 py-4 md:px-6 print:h-auto print:px-0 print:py-0">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 shadow-[0_40px_120px_rgba(3,8,12,0.55)] backdrop-blur-xl print:min-h-0 print:max-w-none print:rounded-none print:border-0 print:bg-white print:shadow-none">
        <AppHeader
          workspaceName={workspaceName}
          workspaceTrail={workspaceTrail}
          onResetRoot={resetToRoot}
          onNavigateWorkspaceTrail={navigateToWorkspaceTrail}
          onLeaveWorkspace={leaveWorkspace}
          onSignOut={() => void signOut()}
          onExportPng={() => void exportAsPng()}
          onExportPdf={exportAsPdf}
          onOpenSettings={
            organizationRole === 'owner' || organizationRole === 'admin'
              ? () => setIsSettingsOpen(true)
              : undefined
          }
          workflowViewMode={workflowViewMode}
          onWorkflowViewModeChange={(mode) => setWorkflowViewMode(mode)}
          groupingMode={groupingMode}
          onToggleGroupingMode={() => setGroupingMode((current) => (current === 'free' ? 'role_lanes' : 'free'))}
          canvasSearchOptions={canvasSearchOptions}
          onSelectCanvasSearchResult={(nodeId) => {
            setFocusedCanvasNodeId(null)
            window.setTimeout(() => setFocusedCanvasNodeId(nodeId), 0)
            setSelectedCanvasNodeId(nodeId)
            setSelectedCanvasEdgeId(null)
            setSelectedDataObjectId(null)
            selectedCanvasNodeIdRef.current = nodeId
            selectedCanvasEdgeIdRef.current = null
          }}
          onUndo={() => void undo()}
          onRedo={() => void redo()}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
        />

        <main className="grid min-h-0 flex-1 gap-4 p-4 print:block print:p-0">
          <section className="relative min-h-0 overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,20,31,0.92),rgba(6,14,22,0.96))] print:rounded-none print:border-0 print:bg-white">
            {workflowViewMode === 'canvas' ? (
              <FloatingCanvasToolbar
                onInsertStart={() => void insertActivity('start_event')}
                onInsertActivity={() => void insertActivity('activity')}
                onInsertDecision={() => void insertActivity('gateway_decision')}
                onInsertMerge={() => void insertActivity('gateway_merge')}
                onInsertEnd={() => void insertActivity('end_event')}
                onInsertQuelle={() => void insertCanvasObject('quelle')}
                onInsertDatenobjekt={() => void insertCanvasObject('datenobjekt')}
                onUndo={() => void undo()}
                onRedo={() => void redo()}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                hasStart={hasStart}
                hasEnd={hasEnd}
                onToolbarDragStart={() => {}}
                dataObjectToolbarHint={dataObjectToolbarHint}
              />
            ) : null}
            {dataObjectActionError ? (
              <div className="absolute left-4 right-4 top-4 z-30 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {dataObjectActionError}
              </div>
            ) : null}
            {workflowViewMode === 'canvas' ? (
              <div className="h-full pl-24 sm:pl-28">
                <WorkflowCanvas
                  activities={visibleActivities}
                  canvasObjects={visibleCanvasObjects}
                  canvasEdges={visibleCanvasEdges}
                  selectedNodeId={selectedCanvasNodeId}
                  selectedEdgeId={selectedCanvasEdgeId}
                  selectedDataObjectId={selectedDataObjectId}
                  groupingMode={groupingMode}
                  activityRolesById={activityRolesById}
                  activityAssigneesById={activityAssigneesById}
                  focusNodeId={focusedCanvasNodeId}
                  onInterruptFocusAnimation={() => setFocusedCanvasNodeId(null)}
                  onViewportCenterChange={setViewportCenter}
                  onSelectionChange={({ nodeId, edgeId, dataObjectId }) => {
                    setSelectedCanvasNodeId(nodeId)
                    setSelectedCanvasEdgeId(edgeId)
                    setSelectedDataObjectId(dataObjectId)
                    selectedCanvasNodeIdRef.current = nodeId
                    selectedCanvasEdgeIdRef.current = edgeId
                  }}
                  onToolbarDrop={({ kind, position }) => {
                    const centeredPosition =
                      kind === 'start'
                        ? getPositionForExplicitDrop('start_event', position)
                        : kind === 'activity'
                          ? getPositionForExplicitDrop('activity', position)
                          : kind === 'decision'
                            ? getPositionForExplicitDrop('gateway_decision', position)
                            : kind === 'merge'
                              ? getPositionForExplicitDrop('gateway_merge', position)
                          : kind === 'end'
                            ? getPositionForExplicitDrop('end_event', position)
                            : getPositionForExplicitDrop('quelle', position)

                    if (kind === 'start') {
                      void insertActivity('start_event', { position: centeredPosition, allowSmartInsert: false })
                      return
                    }

                    if (kind === 'activity') {
                      void insertActivity('activity', { position: centeredPosition, allowSmartInsert: false })
                      return
                    }

                    if (kind === 'decision') {
                      void insertActivity('gateway_decision', { position: centeredPosition, allowSmartInsert: false })
                      return
                    }

                    if (kind === 'merge') {
                      void insertActivity('gateway_merge', { position: centeredPosition, allowSmartInsert: false })
                      return
                    }

                    if (kind === 'end') {
                      void insertActivity('end_event', { position: centeredPosition, allowSmartInsert: false })
                      return
                    }

                    if (kind === 'quelle') {
                      void insertCanvasObject('quelle', { position: centeredPosition })
                    }
                  }}
                  onOpenSubprocessMenu={(activity, position) => {
                    setSubprocessMenu({ activity, position })
                  }}
                  onOpenSubprocess={(activity) => {
                    openLinkedSubprocess(activity)
                  }}
                  onInlineRenameActivity={(activityId, nextLabel) => void renameActivityInline(activityId, nextLabel)}
                  onConnectEdge={(connection) => void connectCanvasNodes(connection)}
                  onCreateActivityFromConnectionDrop={(input) => void createActivityFromConnectionDrop(input)}
                  onMoveNode={(nodeId, position) => void persistNodePosition(nodeId, position)}
                  onDeleteEdges={(edgeIds) => void removeEdges(edgeIds)}
                  onDeleteDataObject={(id) => void removeDataObject(id)}
                  onDeleteSelection={(selection) => void removeSelection(selection)}
                  onCreateDataObjectOnEdge={(edgeId) => void createEdgeDataObject(edgeId)}
                  onAddExistingDataObjectToEdge={(edgeId, dataObjectId) => void addExistingDataObjectToEdge(edgeId, dataObjectId)}
                  onSelectActivity={(activity) => {
                    setSelectedActivityId(activity.id)
                    setIsActivityPopupOpen(true)
                  }}
                  onOpenDataObject={(object) => {
                    setDataObjectActionError(null)
                    setSelectedDataObjectId(object.id)
                    setIsDataObjectPopupOpen(true)
                  }}
                />
              </div>
            ) : (
              <div className="h-full p-4">
                <WorkflowSipocTable
                  rows={sipocRows}
                  onSelectActivity={(activityId) => {
                    setWorkflowViewMode('canvas')
                    setSelectedCanvasNodeId(activityId)
                    setSelectedCanvasEdgeId(null)
                    setSelectedDataObjectId(null)
                    selectedCanvasNodeIdRef.current = activityId
                    selectedCanvasEdgeIdRef.current = null
                    setFocusedCanvasNodeId(null)
                    window.setTimeout(() => setFocusedCanvasNodeId(activityId), 0)
                  }}
                />
              </div>
            )}

            {isActivityPopupOpen && selectedActivity ? (
              <ActivityDetailPopup
                activity={selectedActivity}
                workspaceId={workspaceId}
                organizationId={organizationId}
                currentUserId={currentUserId}
                canvasObjects={visibleCanvasObjects}
                canvasEdges={visibleCanvasEdges}
                connectionCount={visibleCanvasEdges.filter((edge) => edge.from_node_id === selectedActivity.id || edge.to_node_id === selectedActivity.id).length}
                onDelete={() => void removeActivity(selectedActivity)}
                onClose={() => setIsActivityPopupOpen(false)}
              />
            ) : null}
            {isDataObjectPopupOpen && selectedObject ? (
              <DataObjectPopup
                canvasObject={selectedObject}
                onClose={() => setIsDataObjectPopupOpen(false)}
                onSave={(input) => void saveCanvasObjectDetails(input)}
                onDelete={(id) => void deleteCanvasObjectFromDialog(id)}
              />
            ) : null}
            {selectedEdge && !isActivityPopupOpen && !isDataObjectPopupOpen ? (
              <EdgeDetailPanel
                edge={selectedEdge}
                allowPathLabel={selectedEdgeAllowsPathLabel}
                dataObjects={selectedEdgeDataObjects}
                reusableDataObjects={selectedEdgeReusableDataObjects}
                onClose={() => {
                  setSelectedCanvasEdgeId(null)
                  selectedCanvasEdgeIdRef.current = null
                }}
                transportModes={transportModes}
                canCreateTransportMode={organizationRole === 'owner' || organizationRole === 'admin'}
                onCreateTransportMode={(input) =>
                  createTransportMode.mutateAsync({
                    label: input.label,
                    description: input.description,
                    is_default: input.is_default,
                  })
                }
                onSave={(input) => void updateEdge(selectedEdge.id, input)}
                onAddNewDataObject={() => createEdgeDataObject(selectedEdge.id)}
                onAddExistingDataObject={(dataObjectId) => void addExistingDataObjectToEdge(selectedEdge.id, dataObjectId)}
                onRenameDataObject={(dataObjectId, name) => renameEdgeDataObject(dataObjectId, name)}
                onOpenDataObject={(object) => {
                  setDataObjectActionError(null)
                  setSelectedDataObjectId(object.id)
                  setIsDataObjectPopupOpen(true)
                }}
                onDeleteDataObject={(dataObjectId) => void removeDataObject(dataObjectId)}
              />
            ) : null}
          <SettingsDialog
            organizationId={organizationId}
            organizationName={organizationName ?? ''}
            organizationRole={organizationRole}
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onOrganizationRenamed={updateOrganizationName}
            onUiPreferencesChange={(preferences) => setGroupingMode(preferences.default_grouping_mode)}
          />
          {subprocessMenu ? (
              <SubprocessMenu
                activity={subprocessMenu.activity}
                position={subprocessMenu.position}
                onCreateNew={() => {
                  setWizardActivity(subprocessMenu.activity)
                  setLinkActivity(null)
                  setSubprocessMenu(null)
                }}
                onLinkExisting={() => {
                  setLinkActivity(subprocessMenu.activity)
                  setWizardActivity(null)
                  setSubprocessMenu(null)
                }}
                onOpenLinked={() => openLinkedSubprocess(subprocessMenu.activity)}
                onUnlink={() => void handleUnlinkSubprocess(subprocessMenu.activity)}
                onClose={() => setSubprocessMenu(null)}
              />
            ) : null}
            {wizardActivity ? (
              <SubprocessWizard
                activityLabel={wizardActivity.label}
                onClose={() => setWizardActivity(null)}
                onSubmit={(input) => void handleCreateSubprocess(input)}
                isSubmitting={createSubprocess.isPending}
              />
            ) : null}
            {linkActivity ? (
              <LinkWorkflowModal
                currentWorkspaceId={workspaceId}
                workspaces={workspaces}
                onClose={() => setLinkActivity(null)}
                onSubmit={(input) => void handleLinkExistingSubprocess(input)}
                isSubmitting={linkSubprocess.isPending}
              />
            ) : null}
          </section>

        </main>
      </div>
    </div>
  )
}


