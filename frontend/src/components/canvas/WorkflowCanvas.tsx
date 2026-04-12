import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  SelectionMode,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnConnectEnd,
  type OnConnectStartParams,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Group, Lock, Workflow } from 'lucide-react'
import { ActivityNode } from './ActivityNode'
import { EndNode } from './EndNode'
import { GatewayNode } from './GatewayNode'
import { SourceNode } from './SourceNode'
import { StartNode } from './StartNode'
import { WorkflowEdge } from './WorkflowEdge'
import type {
  Activity,
  ActivityType,
  ActivityNodeData,
  CatalogRole,
  CanvasGroupingMode,
  CanvasEdge,
  CanvasObject,
  CanvasObjectNodeData,
  EdgeDataObject,
} from '../../types'

const nodeTypes = {
  activity: ActivityNode,
  gatewayNode: GatewayNode,
  startNode: StartNode,
  endNode: EndNode,
  sourceNode: SourceNode,
}

const edgeTypes = {
  workflow: WorkflowEdge,
}

const baseEdgeStyle = {
  stroke: 'rgba(139, 170, 197, 0.7)',
  strokeWidth: 1.8,
}

const ROLE_LANE_HEIGHT = 200
const ROLE_LANE_TOP_OFFSET = 72
const ROLE_LANE_NODE_OFFSET = 54
const CONNECTOR_PREVIEW_PROXIMITY_PX = 40
const NODE_COLLISION_GAP = 28
const DEFAULT_NODE_DIMENSIONS = {
  activity: { width: 220, height: 140 },
  source: { width: 176, height: 64 },
  start_event: { width: 56, height: 56 },
  end_event: { width: 56, height: 56 },
  gateway_decision: { width: 120, height: 120 },
  gateway_merge: { width: 120, height: 120 },
}

function rectanglesOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) {
  return left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y
}

function getOverlapArea(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) {
  const overlapWidth = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x))
  const overlapHeight = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y))
  return overlapWidth * overlapHeight
}

function buildRoleLaneMeta(activities: Activity[], activityRolesById: Record<string, string>) {
  const roles = Array.from(
    new Set(activities.map((activity) => activityRolesById[activity.id] ?? 'Nicht zugeordnet')),
  )
    .filter((role) => role !== 'Nicht zugeordnet')
    .sort((left, right) => left.localeCompare(right, 'de'))

  roles.push('Nicht zugeordnet')

  return roles.map((role, index) => ({
    role,
    top: ROLE_LANE_TOP_OFFSET + index * ROLE_LANE_HEIGHT,
  }))
}

function getLaneDisplayY(roleLanes: Array<{ role: string; top: number }>, activityId: string, activityRolesById: Record<string, string>) {
  const role = activityRolesById[activityId] ?? 'Nicht zugeordnet'
  const lane = roleLanes.find((entry) => entry.role === role)
  return lane ? lane.top + ROLE_LANE_NODE_OFFSET : null
}

function getNodeConnectionCapabilities(nodeId: string, activities: Activity[], canvasObjects: CanvasObject[], canvasEdges: CanvasEdge[]) {
  const activity = activities.find((item) => item.id === nodeId)
  if (activity) {
    const incomingCount = canvasEdges.filter((edge) => edge.to_node_type === 'activity' && edge.to_node_id === nodeId).length
    const outgoingCount = canvasEdges.filter((edge) => edge.from_node_type === 'activity' && edge.from_node_id === nodeId).length

    if (activity.node_type === 'start_event') {
      return {
        allowTarget: false,
        allowSource: true,
      }
    }

    if (activity.node_type === 'end_event') {
      return {
        allowTarget: true,
        allowSource: false,
      }
    }

    if (activity.node_type === 'gateway_decision') {
      return {
        allowTarget: incomingCount === 0,
        allowSource: true,
      }
    }

    if (activity.node_type === 'gateway_merge') {
      return {
        allowTarget: true,
        allowSource: outgoingCount === 0,
      }
    }

    return {
      allowTarget: true,
      allowSource: true,
    }
  }

  const canvasObject = canvasObjects.find((item) => item.id === nodeId && item.object_type === 'quelle')
  if (canvasObject) {
    return {
      allowTarget: true,
      allowSource: true,
    }
  }

  return {
    allowTarget: false,
    allowSource: false,
  }
}

function getClosestTargetHandleId(nodeElement: Element, clientX: number, clientY: number) {
  const rect = nodeElement.getBoundingClientRect()
  const distances = [
    { handleId: 'target-top', distance: Math.abs(clientY - rect.top) },
    { handleId: 'target-right', distance: Math.abs(clientX - rect.right) },
    { handleId: 'target-bottom', distance: Math.abs(clientY - rect.bottom) },
    { handleId: 'target-left', distance: Math.abs(clientX - rect.left) },
  ]

  distances.sort((a, b) => a.distance - b.distance)
  return distances[0]?.handleId ?? 'target-left'
}

function getDistanceToNodeBox(nodeElement: Element, clientX: number, clientY: number) {
  const rect = nodeElement.getBoundingClientRect()
  const dx = Math.max(rect.left - clientX, 0, clientX - rect.right)
  const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom)
  return Math.hypot(dx, dy)
}

interface WorkflowCanvasProps {
  workspaceId: string
  autoFitOnLoad?: boolean
  viewportRestoreRequest?: { workspaceId: string; center: { x: number; y: number; zoom: number } } | null
  onViewportRestoreApplied?: () => void
  activities: Activity[]
  canvasObjects: CanvasObject[]
  canvasEdges: CanvasEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  selectedDataObjectId: string | null
  groupingMode: CanvasGroupingMode
  snapToGridEnabled?: boolean
  collisionAvoidanceEnabled?: boolean
  activityRolesById: Record<string, string>
  activityRoleAcronymsById: Record<string, string | null>
  organizationRoles: CatalogRole[]
  activityAssigneesById: Record<string, string | null>
  focusNodeId: string | null
  onInterruptFocusAnimation?: () => void
  onViewportCenterChange: (position: { x: number; y: number; zoom: number }) => void
  onSelectionChange: (selection: { nodeId: string | null; edgeId: string | null; dataObjectId: string | null }) => void
  onToolbarDrop: (input: { kind: 'start' | 'activity' | 'decision' | 'merge' | 'end' | 'quelle'; position: { x: number; y: number } }) => void
  onSelectActivity: (activity: Activity) => void
  onOpenDataObject: (object: EdgeDataObject | CanvasObject) => void
  onOpenSubprocess: (activity: Activity) => void
  onCreateSubprocess: (activity: Activity) => void
  onLinkSubprocess: (activity: Activity) => void
  onUnlinkSubprocess: (activity: Activity) => void
  onDeleteLinkedSubprocess: (activity: Activity) => void
  onInlineRenameActivity: (activityId: string, label: string) => Promise<void> | void
  onQuickChangeActivityType: (activityId: string, nextType: ActivityType) => Promise<void> | void
  onQuickChangeActivityRole: (activityId: string, roleId: string | null) => Promise<void> | void
  onCreateRole: (input: { label: string; acronym?: string | null; description: string }) => Promise<CatalogRole | void> | CatalogRole | void
  onConnectEdge: (connection: Connection) => void
  onCreateActivityFromConnectionDrop: (input: {
    sourceNodeId: string
    sourceHandleId: string | null
    position: { x: number; y: number }
  }) => void
  onMoveNode: (nodeId: string, position: { x: number; y: number }) => void
  onToggleLockSelection: (nodeIds: string[]) => Promise<void> | void
  onAggregateActivities: (activityIds: string[]) => Promise<void> | void
  onDeleteEdges: (edgeIds: string[]) => void
  onDeleteDataObject: (id: string) => void
  onDeleteSelection: (selection: { nodeIds: string[]; edgeIds: string[] }) => void
  onCreateDataObjectOnEdge: (edgeId: string) => void
  onAddExistingDataObjectToEdge: (edgeId: string, dataObjectId: string) => void
}

export function WorkflowCanvas({
  workspaceId,
  autoFitOnLoad = true,
  viewportRestoreRequest = null,
  onViewportRestoreApplied,
  activities,
  canvasObjects,
  canvasEdges,
  selectedNodeId,
  selectedEdgeId,
  selectedDataObjectId,
  groupingMode,
  snapToGridEnabled = true,
  collisionAvoidanceEnabled = true,
  activityRolesById,
  activityRoleAcronymsById,
  organizationRoles,
  activityAssigneesById,
  focusNodeId,
  onInterruptFocusAnimation,
  onViewportCenterChange,
  onSelectionChange,
  onToolbarDrop,
  onSelectActivity,
  onOpenDataObject,
  onOpenSubprocess,
  onCreateSubprocess,
  onLinkSubprocess,
  onUnlinkSubprocess,
  onDeleteLinkedSubprocess,
  onInlineRenameActivity,
  onQuickChangeActivityType,
  onQuickChangeActivityRole,
  onCreateRole,
  onConnectEdge,
  onCreateActivityFromConnectionDrop,
  onMoveNode,
  onToggleLockSelection,
  onAggregateActivities,
  onDeleteEdges,
  onDeleteDataObject,
  onDeleteSelection,
  onCreateDataObjectOnEdge,
  onAddExistingDataObjectToEdge,
}: WorkflowCanvasProps) {
  const reactFlowRef = useRef<ReactFlowInstance | null>(null)
  const lastFitWorkspaceRef = useRef<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const pendingConnectionRef = useRef<{ nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null } | null>(null)
  const connectionSucceededRef = useRef(false)
  const [activeConnectionSource, setActiveConnectionSource] = useState<{
    nodeId: string
    handleId: string | null
    handleType: 'source' | 'target' | null
  } | null>(null)
  const [hoveredConnectionTargetNodeId, setHoveredConnectionTargetNodeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [liveNodePositions, setLiveNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const [openEdgePopoverId, setOpenEdgePopoverId] = useState<string | null>(null)
  const [selectionActionMenu, setSelectionActionMenu] = useState<{ left: number; top: number } | null>(null)
  const focusAnimationTimeoutRef = useRef<number | null>(null)
  const isFocusAnimationActiveRef = useRef(false)
  const isLassoSelectionRef = useRef(false)
  const selectedNodeIdsRef = useRef<string[]>([])

  const interruptFocusAnimation = useMemo(
    () => () => {
      const hadActiveFocusAnimation = isFocusAnimationActiveRef.current

      isFocusAnimationActiveRef.current = false
      if (focusAnimationTimeoutRef.current) {
        window.clearTimeout(focusAnimationTimeoutRef.current)
        focusAnimationTimeoutRef.current = null
      }

      if (hadActiveFocusAnimation) {
        const instance = reactFlowRef.current as (ReactFlowInstance & {
          getViewport?: () => { x: number; y: number; zoom: number }
        }) | null
        const viewport = typeof instance?.getViewport === 'function' ? instance.getViewport() : null
        if (instance && viewport && typeof instance.setViewport === 'function') {
          void instance.setViewport(viewport, { duration: 0 })
        }
      }

      onInterruptFocusAnimation?.()
    },
    [onInterruptFocusAnimation],
  )

  const sourceObjects = useMemo(
    () => canvasObjects.filter((item): item is Extract<CanvasObject, { object_type: 'quelle' }> => item.object_type === 'quelle'),
    [canvasObjects],
  )

  const edgeDataObjectsByEdge = useMemo(() => {
    const grouped = new Map<string, EdgeDataObject[]>()
    for (const canvasObject of canvasObjects) {
      if (canvasObject.object_type !== 'datenobjekt') {
        continue
      }

      const current = grouped.get(canvasObject.edge_id) ?? []
      current.push(canvasObject)
      current.sort((left, right) => left.edge_sort_order - right.edge_sort_order)
      grouped.set(canvasObject.edge_id, current)
    }
    return grouped
  }, [canvasObjects])
  const roleLanes = useMemo(
    () => (groupingMode === 'role_lanes' ? buildRoleLaneMeta(activities, activityRolesById) : []),
    [activities, activityRolesById, groupingMode],
  )

  useEffect(() => {
    setSelectedNodeIds(selectedNodeId ? [selectedNodeId] : [])
  }, [selectedNodeId])

  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds
  }, [selectedNodeIds])

  useEffect(() => {
    setSelectedEdgeIds(selectedEdgeId ? [selectedEdgeId] : [])
  }, [selectedEdgeId])

  useEffect(() => {
    if (!selectedEdgeId) {
      setOpenEdgePopoverId(null)
    }
  }, [selectedEdgeId])

  useEffect(() => {
    if (!activeConnectionSource) {
      setHoveredConnectionTargetNodeId(null)
    }
  }, [activeConnectionSource])

  const publishViewportCenter = useMemo(
    () => () => {
      const instance = reactFlowRef.current
      const wrapper = wrapperRef.current
      if (!instance || !wrapper) {
        return
      }

      const rect = wrapper.getBoundingClientRect()
      const center = instance.screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
      const zoom = typeof instance.getZoom === 'function' ? instance.getZoom() : 1
      onViewportCenterChange({
        ...center,
        zoom,
      })
    },
    [onViewportCenterChange],
  )

  const updateHoveredConnectionTarget = useMemo(
    () => (clientX: number, clientY: number) => {
      const pendingConnection = pendingConnectionRef.current
      if (!pendingConnection || pendingConnection.handleType !== 'source') {
        setHoveredConnectionTargetNodeId(null)
        return
      }

      const candidates = Array.from(wrapperRef.current?.querySelectorAll<HTMLElement>('.react-flow__node[data-id]') ?? [])
        .map((nodeElement) => {
          const targetNodeId = nodeElement.getAttribute('data-id')
          if (!targetNodeId || targetNodeId === pendingConnection.nodeId) {
            return null
          }

          const capabilities = getNodeConnectionCapabilities(targetNodeId, activities, sourceObjects, canvasEdges)
          if (!capabilities.allowTarget) {
            return null
          }

          const distance = getDistanceToNodeBox(nodeElement, clientX, clientY)
          if (distance > CONNECTOR_PREVIEW_PROXIMITY_PX) {
            return null
          }

          return {
            nodeId: targetNodeId,
            distance,
          }
        })
        .filter((candidate): candidate is { nodeId: string; distance: number } => Boolean(candidate))
        .sort((left, right) => left.distance - right.distance)

      setHoveredConnectionTargetNodeId(candidates[0]?.nodeId ?? null)
    },
    [activities, canvasEdges, sourceObjects],
  )

  const handleNodeDragStop = useMemo(
    () => (_event: ReactMouseEvent, node: Node<ActivityNodeData | CanvasObjectNodeData>) => {
      if (node.data && 'activity' in node.data && node.data.activity.is_locked) {
        return
      }

      if (node.data && 'canvasObject' in node.data && node.data.canvasObject.is_locked) {
        return
      }

      const activity = activities.find((item) => item.id === node.id)
      const persistedDraggedPosition =
        groupingMode === 'role_lanes' && activity
          ? {
              x: node.position.x,
              y: activity.position_y,
            }
          : node.position

      if (collisionAvoidanceEnabled) {
        const draggedWidth =
          node.width ??
          (activity ? DEFAULT_NODE_DIMENSIONS[activity.node_type].width : DEFAULT_NODE_DIMENSIONS.source.width)
        const draggedHeight =
          node.height ??
          (activity ? DEFAULT_NODE_DIMENSIONS[activity.node_type].height : DEFAULT_NODE_DIMENSIONS.source.height)

        const draggedRect = {
          x: persistedDraggedPosition.x,
          y: persistedDraggedPosition.y,
          width: draggedWidth,
          height: draggedHeight,
        }

        const candidates = [
          ...activities.filter((item) => item.id !== node.id).map((item) => ({
            id: item.id,
            kind: 'activity' as const,
            position: liveNodePositions[item.id] ?? { x: item.position_x, y: groupingMode === 'role_lanes' ? getLaneDisplayY(roleLanes, item.id, activityRolesById) ?? item.position_y : item.position_y },
            width: DEFAULT_NODE_DIMENSIONS[item.node_type].width,
            height: DEFAULT_NODE_DIMENSIONS[item.node_type].height,
            nodeType: item.node_type,
          })),
          ...sourceObjects.filter((item) => item.id !== node.id).map((item) => ({
            id: item.id,
            kind: 'source' as const,
            position: liveNodePositions[item.id] ?? { x: item.position_x, y: item.position_y },
            width: DEFAULT_NODE_DIMENSIONS.source.width,
            height: DEFAULT_NODE_DIMENSIONS.source.height,
            nodeType: null,
          })),
        ]

        const collidedCandidate = candidates
          .filter((candidate) =>
            rectanglesOverlap(draggedRect, {
              x: candidate.position.x,
              y: candidate.position.y,
              width: candidate.width,
              height: candidate.height,
            }),
          )
          .map((candidate) => ({
            ...candidate,
            overlapArea: getOverlapArea(draggedRect, {
              x: candidate.position.x,
              y: candidate.position.y,
              width: candidate.width,
              height: candidate.height,
            }),
          }))
          .sort((left, right) => right.overlapArea - left.overlapArea)[0]

        if (collidedCandidate) {
          const draggedCenterX = draggedRect.x + draggedRect.width / 2
          const draggedCenterY = draggedRect.y + draggedRect.height / 2
          const candidateCenterX = collidedCandidate.position.x + collidedCandidate.width / 2
          const candidateCenterY = collidedCandidate.position.y + collidedCandidate.height / 2
          const nextCollisionPosition =
            groupingMode === 'role_lanes' && collidedCandidate.kind === 'activity'
              ? {
                  x:
                    candidateCenterX >= draggedCenterX
                      ? draggedRect.x + draggedRect.width + NODE_COLLISION_GAP
                      : draggedRect.x - collidedCandidate.width - NODE_COLLISION_GAP,
                  y: collidedCandidate.position.y,
                }
              : Math.abs(candidateCenterX - draggedCenterX) >= Math.abs(candidateCenterY - draggedCenterY)
                ? {
                    x:
                      candidateCenterX >= draggedCenterX
                        ? draggedRect.x + draggedRect.width + NODE_COLLISION_GAP
                        : draggedRect.x - collidedCandidate.width - NODE_COLLISION_GAP,
                    y: collidedCandidate.position.y,
                  }
                : {
                    x: collidedCandidate.position.x,
                    y:
                      candidateCenterY >= draggedCenterY
                        ? draggedRect.y + draggedRect.height + NODE_COLLISION_GAP
                        : draggedRect.y - collidedCandidate.height - NODE_COLLISION_GAP,
                  }

          setLiveNodePositions((current) => ({
            ...current,
            [collidedCandidate.id]: nextCollisionPosition,
          }))
          onMoveNode(collidedCandidate.id, nextCollisionPosition)
        }
      }

      if (groupingMode === 'role_lanes' && activity) {
        onMoveNode(node.id, persistedDraggedPosition)
        return
      }

      onMoveNode(node.id, persistedDraggedPosition)
    },
    [activities, activityRolesById, collisionAvoidanceEnabled, groupingMode, liveNodePositions, onMoveNode, roleLanes, sourceObjects],
  )

  const handleNodeDrag = useMemo(
    () => (_event: ReactMouseEvent, node: Node<ActivityNodeData | CanvasObjectNodeData>) => {
      if (node.data && 'activity' in node.data && node.data.activity.is_locked) {
        return
      }

      if (node.data && 'canvasObject' in node.data && node.data.canvasObject.is_locked) {
        return
      }

      interruptFocusAnimation()
      const activity = activities.find((item) => item.id === node.id)
      if (groupingMode === 'role_lanes' && activity) {
        setLiveNodePositions((current) => ({
          ...current,
          [node.id]: {
            x: node.position.x,
            y: activity.position_y,
          },
        }))
        return
      }

      setLiveNodePositions((current) => ({
        ...current,
        [node.id]: node.position,
      }))
    },
    [activities, groupingMode, interruptFocusAnimation],
  )

  useEffect(() => {
    setLiveNodePositions((current) => {
      const next = { ...current }
      for (const [id, position] of Object.entries(current)) {
        const activity = activities.find((item) => item.id === id)
        const canvasObject = sourceObjects.find((item) => item.id === id)
        if (!activity && !canvasObject) {
          delete next[id]
          continue
        }

        const persistedX = activity?.position_x ?? canvasObject?.position_x
        const persistedY = activity?.position_y ?? canvasObject?.position_y
        if (persistedX === position.x && persistedY === position.y) {
          delete next[id]
        }
      }
      return next
    })
  }, [activities, sourceObjects])

  useEffect(() => {
    publishViewportCenter()
  }, [publishViewportCenter, activities.length, sourceObjects.length])

  const handleConnectEnd: OnConnectEnd = (event) => {
    const pendingConnection = pendingConnectionRef.current
    pendingConnectionRef.current = null
    setActiveConnectionSource(null)
    setHoveredConnectionTargetNodeId(null)

    if (!pendingConnection || pendingConnection.handleType !== 'source' || !pendingConnection.nodeId) {
      return
    }

    const point = 'changedTouches' in event ? event.changedTouches[0] : event
    const eventTarget = event.target instanceof Element ? event.target : null
    const droppedOnPane = Boolean(eventTarget?.closest('.react-flow__pane'))
    const droppedOnHandle = Boolean(eventTarget?.closest('.react-flow__handle'))
    const droppedOnNodeElement = eventTarget?.closest('.react-flow__node') ?? null
    const droppedOnNode = Boolean(droppedOnNodeElement)

    if (droppedOnNode && droppedOnNodeElement) {
      const targetNodeId = droppedOnNodeElement.getAttribute('data-id')
      if (!targetNodeId || targetNodeId === pendingConnection.nodeId) {
        return
      }

      const targetCapabilities = getNodeConnectionCapabilities(targetNodeId, activities, sourceObjects, canvasEdges)
      if (!targetCapabilities.allowTarget) {
        return
      }

      const targetHandleId = getClosestTargetHandleId(droppedOnNodeElement, point.clientX, point.clientY)

      window.setTimeout(() => {
        if (connectionSucceededRef.current) {
          connectionSucceededRef.current = false
          return
        }

        onConnectEdge({
          source: pendingConnection.nodeId,
          sourceHandle: pendingConnection.handleId,
          target: targetNodeId,
          targetHandle: targetHandleId,
        })
      }, 0)
      return
    }

    if (!droppedOnPane || droppedOnHandle) {
      return
    }

    const position = reactFlowRef.current?.screenToFlowPosition({
      x: point.clientX,
      y: point.clientY,
    })

    if (!position) {
      return
    }

    window.setTimeout(() => {
      if (connectionSucceededRef.current) {
        connectionSucceededRef.current = false
        return
      }

      onCreateActivityFromConnectionDrop({
        sourceNodeId: pendingConnection.nodeId,
        sourceHandleId: pendingConnection.handleId,
        position,
      })
    }, 0)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Backspace' && event.key !== 'Delete') {
        return
      }

      const target = event.target as HTMLElement | null
      const isTyping = Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable))
      if (isTyping) {
        return
      }

      if (selectedDataObjectId) {
        event.preventDefault()
        void onDeleteDataObject(selectedDataObjectId)
        onSelectionChange({ nodeId: null, edgeId: null, dataObjectId: null })
        return
      }

      if (selectedEdgeIds.length === 0) {
        return
      }

      event.preventDefault()
      void onDeleteEdges(selectedEdgeIds)
      setSelectedEdgeIds([])
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onDeleteDataObject, onDeleteEdges, onSelectionChange, selectedDataObjectId, selectedEdgeIds])

  useEffect(() => {
    if (!selectionActionMenu) {
      return
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-testid="canvas-selection-actions"]')) {
        return
      }

      setSelectionActionMenu(null)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectionActionMenu(null)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [selectionActionMenu])

  const nodes = useMemo<Array<Node<ActivityNodeData | CanvasObjectNodeData>>>(() => {
    const childrenByParent = new Set(activities.map((activity) => activity.parent_id).filter(Boolean))

      const activityNodes = activities.map<Node<ActivityNodeData>>((activity) => {
      const freePosition = liveNodePositions[activity.id] ?? { x: activity.position_x, y: activity.position_y }
      const laneDisplayY = getLaneDisplayY(roleLanes, activity.id, activityRolesById)
      const isSelected = selectedNodeIds.includes(activity.id)
      const isConnectionPreviewTarget = hoveredConnectionTargetNodeId === activity.id

      return {
        id: activity.id,
        type:
          activity.node_type === 'start_event'
            ? 'startNode'
            : activity.node_type === 'end_event'
              ? 'endNode'
              : activity.node_type === 'gateway_decision' || activity.node_type === 'gateway_merge'
                ? 'gatewayNode'
                : 'activity',
        position:
          groupingMode === 'role_lanes' && laneDisplayY !== null
            ? { x: freePosition.x, y: laneDisplayY }
            : freePosition,
        selected: isSelected,
        draggable: !activity.is_locked,
          data: {
            activity,
            hasChildren: childrenByParent.has(activity.id),
            roleLabel: activityRolesById[activity.id] ?? 'Nicht zugeordnet',
            roleAcronym: activityRoleAcronymsById[activity.id] ?? null,
            availableRoles: organizationRoles,
            assigneeLabel: activityAssigneesById[activity.id] ?? null,
            groupingMode,
            showHandles: isSelected || isConnectionPreviewTarget,
            isConnectionPreviewTarget,
          onOpenDetail: (id) => {
            const selected = activities.find((entry) => entry.id === id)
            if (selected) {
              onSelectActivity(selected)
            }
          },
          onOpenSubprocess: (id) => {
            const selected = activities.find((entry) => entry.id === id)
            if (selected) {
              onOpenSubprocess(selected)
            }
          },
          onCreateSubprocess: (id) => {
            const selected = activities.find((entry) => entry.id === id)
            if (selected) {
              onCreateSubprocess(selected)
            }
          },
          onLinkSubprocess: (id) => {
            const selected = activities.find((entry) => entry.id === id)
            if (selected) {
              onLinkSubprocess(selected)
            }
          },
          onUnlinkSubprocess: (id) => {
            const selected = activities.find((entry) => entry.id === id)
            if (selected) {
              onUnlinkSubprocess(selected)
            }
          },
          onDeleteLinkedSubprocess: (id) => {
            const selected = activities.find((entry) => entry.id === id)
            if (selected) {
              onDeleteLinkedSubprocess(selected)
            }
          },
          onInlineRename: (id, nextLabel) => onInlineRenameActivity(id, nextLabel),
          onQuickChangeType: (id, nextType) => onQuickChangeActivityType(id, nextType),
          onQuickChangeRole: (id, roleId) => onQuickChangeActivityRole(id, roleId),
          onCreateRole,
          },
      }
    })

    const objectNodes = sourceObjects.map<Node<CanvasObjectNodeData>>((canvasObject) => ({
      id: canvasObject.id,
      type: 'sourceNode',
      position: liveNodePositions[canvasObject.id] ?? { x: canvasObject.position_x, y: canvasObject.position_y },
      selected: selectedNodeIds.includes(canvasObject.id),
      draggable: !canvasObject.is_locked,
      data: {
        canvasObject,
        showHandles:
          selectedNodeIds.includes(canvasObject.id) || hoveredConnectionTargetNodeId === canvasObject.id,
        isConnectionPreviewTarget: hoveredConnectionTargetNodeId === canvasObject.id,
        onOpenPopup: (id) => {
          const selected = sourceObjects.find((entry) => entry.id === id)
          if (selected) {
            onOpenDataObject(selected)
          }
        },
      },
    }))

    return [...activityNodes, ...objectNodes]
  }, [activities, activityAssigneesById, activityRoleAcronymsById, activityRolesById, groupingMode, hoveredConnectionTargetNodeId, liveNodePositions, onCreateRole, onCreateSubprocess, onDeleteLinkedSubprocess, onInlineRenameActivity, onLinkSubprocess, onOpenDataObject, onOpenSubprocess, onQuickChangeActivityRole, onQuickChangeActivityType, onSelectActivity, onUnlinkSubprocess, organizationRoles, roleLanes, selectedNodeIds, sourceObjects])

  const [renderNodes, setRenderNodes] = useState<Array<Node<ActivityNodeData | CanvasObjectNodeData>>>([])

  useEffect(() => {
    setRenderNodes((current) =>
      nodes.map((node) => {
        const existing = current.find((entry) => entry.id === node.id)
        if (!existing) {
          return node
        }

        const existingWithMeasured = existing as Node<ActivityNodeData | CanvasObjectNodeData> & {
          measured?: { width?: number; height?: number }
        }

        return {
          ...existing,
          ...node,
          width: existing.width,
          height: existing.height,
          ...(existingWithMeasured.measured ? { measured: existingWithMeasured.measured } : {}),
        }
      }),
    )
  }, [nodes])

  useEffect(() => {
    if (!focusNodeId) {
      isFocusAnimationActiveRef.current = false
      return
    }

    const instance = reactFlowRef.current
    const targetNode = renderNodes.find((node) => node.id === focusNodeId)
    if (!instance || !targetNode) {
      return
    }

    const zoom = typeof instance.getZoom === 'function' ? instance.getZoom() : 0.8
    isFocusAnimationActiveRef.current = true
    if (focusAnimationTimeoutRef.current) {
      window.clearTimeout(focusAnimationTimeoutRef.current)
    }
    void instance.setCenter(targetNode.position.x + 110, targetNode.position.y + 70, {
      zoom: Math.max(zoom, 0.9),
      duration: 400,
    })
    focusAnimationTimeoutRef.current = window.setTimeout(() => {
      isFocusAnimationActiveRef.current = false
      focusAnimationTimeoutRef.current = null
    }, 425)
  }, [focusNodeId, renderNodes])

  useEffect(() => {
    const instance = reactFlowRef.current
    if (!autoFitOnLoad || !instance || renderNodes.length === 0) {
      return
    }
    if (lastFitWorkspaceRef.current === workspaceId) {
      return
    }

    lastFitWorkspaceRef.current = workspaceId
    const frame = window.requestAnimationFrame(() => {
      void instance.fitView?.({
        padding: 0.18,
        duration: 250,
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [autoFitOnLoad, renderNodes.length, workspaceId])

  useEffect(() => {
    const instance = reactFlowRef.current
    if (!instance || !viewportRestoreRequest || viewportRestoreRequest.workspaceId !== workspaceId) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      void instance.setCenter?.(viewportRestoreRequest.center.x, viewportRestoreRequest.center.y, {
        zoom: viewportRestoreRequest.center.zoom,
        duration: 0,
      })
      publishViewportCenter()
      onViewportRestoreApplied?.()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [onViewportRestoreApplied, publishViewportCenter, viewportRestoreRequest, workspaceId])

  const selectedRegularActivityIds = useMemo(
    () =>
      selectedNodeIds.filter((nodeId) => {
        const activity = activities.find((entry) => entry.id === nodeId)
        return activity?.node_type === 'activity'
      }),
    [activities, selectedNodeIds],
  )

  const canAggregateSelection =
    selectedNodeIds.length >= 2 &&
    selectedRegularActivityIds.length === selectedNodeIds.length &&
    selectedRegularActivityIds.length >= 2

  function getSelectionActionMenuPosition(nodeIds: string[]) {
    const wrapper = wrapperRef.current
    if (!wrapper || nodeIds.length === 0) {
      return null
    }

    const wrapperRect = wrapper.getBoundingClientRect()
    const nodeRects = nodeIds
      .map((nodeId) => wrapper.querySelector(`.react-flow__node[data-id="${nodeId}"]`))
      .filter((node): node is Element => Boolean(node))
      .map((node) => node.getBoundingClientRect())

    if (nodeRects.length === 0) {
      return null
    }

    const left = Math.min(...nodeRects.map((rect) => rect.left))
    const right = Math.max(...nodeRects.map((rect) => rect.right))
    const bottom = Math.max(...nodeRects.map((rect) => rect.bottom))

    return {
      left: left - wrapperRect.left + (right - left) / 2,
      top: bottom - wrapperRect.top + 14,
    }
  }

  useEffect(
    () => () => {
      if (focusAnimationTimeoutRef.current) {
        window.clearTimeout(focusAnimationTimeoutRef.current)
      }
    },
    [],
  )

  const edges = useMemo<Array<Edge>>(
    () =>
      canvasEdges.map((edge) => ({
        id: edge.id,
        source: edge.from_node_id,
        sourceHandle: edge.from_handle_id ?? undefined,
        target: edge.to_node_id,
        targetHandle: edge.to_handle_id ?? undefined,
        selected: selectedEdgeIds.includes(edge.id),
        type: 'workflow',
        label: edge.label ?? undefined,
        data: {
          label: edge.label,
          dataObjects: edgeDataObjectsByEdge.get(edge.id) ?? [],
          reusableDataObjects: canvasObjects.filter(
            (canvasObject): canvasObject is EdgeDataObject =>
              canvasObject.object_type === 'datenobjekt' && canvasObject.edge_id !== edge.id,
          ),
          selectedDataObjectId,
          isPopoverOpen: openEdgePopoverId === edge.id,
          onOpenDataObject: (canvasObject: EdgeDataObject) => {
            setSelectedNodeIds([])
            setSelectedEdgeIds([])
            setOpenEdgePopoverId(null)
            onSelectionChange({ nodeId: null, edgeId: null, dataObjectId: canvasObject.id })
            onOpenDataObject(canvasObject)
          },
          onCreateDataObject: () => onCreateDataObjectOnEdge(edge.id),
          onAddExistingDataObject: (dataObjectId: string) => onAddExistingDataObjectToEdge(edge.id, dataObjectId),
          onTogglePopover: () => {
            setSelectedNodeIds([])
            setSelectedEdgeIds([edge.id])
            onSelectionChange({ nodeId: null, edgeId: edge.id, dataObjectId: null })
            setOpenEdgePopoverId((current) => (current === edge.id ? null : edge.id))
          },
        },
        animated: false,
        style: {
          ...baseEdgeStyle,
          stroke: selectedEdgeIds.includes(edge.id) ? '#f8fafc' : baseEdgeStyle.stroke,
          strokeWidth: selectedEdgeIds.includes(edge.id) ? 2.8 : baseEdgeStyle.strokeWidth,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: selectedEdgeIds.includes(edge.id) ? '#f8fafc' : baseEdgeStyle.stroke,
          width: 20,
          height: 20,
        },
      })),
    [
      canvasEdges,
      canvasObjects,
      edgeDataObjectsByEdge,
      onAddExistingDataObjectToEdge,
      onCreateDataObjectOnEdge,
      onOpenDataObject,
      onSelectionChange,
      openEdgePopoverId,
      selectedDataObjectId,
      selectedEdgeIds,
    ],
  )

  return (
    <div
      ref={wrapperRef}
      data-testid="workflow-canvas"
      onMouseMove={(event) => {
        if (!activeConnectionSource) {
          return
        }

        updateHoveredConnectionTarget(event.clientX, event.clientY)
      }}
      onMouseLeave={() => {
        if (activeConnectionSource) {
          setHoveredConnectionTargetNodeId(null)
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('application/x-wow-toolbar-item')) {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDrop={(event) => {
        const kind = event.dataTransfer.getData('application/x-wow-toolbar-item') as 'start' | 'activity' | 'decision' | 'merge' | 'end' | 'quelle' | ''
        if (!kind) {
          return
        }

        event.preventDefault()
        const position = reactFlowRef.current?.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
        if (!position) {
          return
        }

        onToolbarDrop({ kind, position })
      }}
      className="relative h-full min-h-0 w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(58,127,163,0.14),transparent_35%),linear-gradient(180deg,#08121b_0%,#060d14_100%)]"
    >
      {groupingMode === 'role_lanes' ? (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" data-testid="role-lane-overlay">
          {roleLanes.map((lane) => (
            <div
              key={lane.role}
              data-testid={`role-lane-${lane.role}`}
              className="absolute left-0 right-0 border-y border-cyan-300/10 bg-cyan-400/[0.035]"
              style={{
                top: `${lane.top}px`,
                height: `${ROLE_LANE_HEIGHT}px`,
              }}
            >
              <div className="absolute left-6 top-4 rounded-full border border-cyan-300/15 bg-slate-950/75 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">
                {lane.role}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {selectionActionMenu && selectedNodeIds.length > 1 ? (
        <div
          data-testid="canvas-selection-actions"
          className="wow-canvas-selection-actions wow-surface-popover"
          style={{
            left: `${selectionActionMenu.left}px`,
            top: `${selectionActionMenu.top}px`,
          }}
        >
          <button
            type="button"
            className="wow-canvas-selection-actions__button"
            data-testid="canvas-selection-action-lock"
            onClick={() => {
              void onToggleLockSelection(selectedNodeIds)
              setSelectionActionMenu(null)
            }}
            aria-label="Sperren"
            title="Sperren"
          >
            <Lock className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="wow-canvas-selection-actions__button wow-canvas-selection-actions__button--disabled"
            data-testid="canvas-selection-action-group"
            aria-label="Gruppieren"
            title="Gruppieren"
            disabled
          >
            <Group className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="wow-canvas-selection-actions__button"
            data-testid="canvas-selection-action-aggregate"
            onClick={() => {
              if (!canAggregateSelection) {
                return
              }

              void onAggregateActivities(selectedRegularActivityIds)
              setSelectionActionMenu(null)
            }}
            aria-label="Zu Subprozess aggregieren"
            title="Zu Subprozess aggregieren"
            disabled={!canAggregateSelection}
          >
            <Workflow className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <ReactFlow
        nodes={renderNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        snapToGrid={snapToGridEnabled}
        snapGrid={[28, 28]}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        nodeDragThreshold={0}
        defaultEdgeOptions={{ animated: false }}
        deleteKeyCode={['Backspace', 'Delete']}
        onInit={(instance) => {
          reactFlowRef.current = instance
          lastFitWorkspaceRef.current = null
          publishViewportCenter()
        }}
        onConnectStart={(_, params: OnConnectStartParams) => {
          connectionSucceededRef.current = false
          const nextConnection = {
            nodeId: params.nodeId ?? '',
            handleId: params.handleId ?? null,
            handleType: params.handleType ?? null,
          }
          pendingConnectionRef.current = nextConnection
          setActiveConnectionSource(nextConnection)
          setHoveredConnectionTargetNodeId(null)
        }}
        onConnect={(connection) => {
          connectionSucceededRef.current = true
          setActiveConnectionSource(null)
          setHoveredConnectionTargetNodeId(null)
          onConnectEdge(connection)
        }}
        onMoveStart={interruptFocusAnimation}
        onMove={publishViewportCenter}
        onSelectionStart={() => {
          isLassoSelectionRef.current = true
          setSelectionActionMenu(null)
        }}
        onSelectionChange={({ nodes: nextNodes, edges: nextEdges }) => {
          const nextNodeIds = nextNodes.map((node) => node.id)
          const nextEdgeIds = nextEdges.map((edge) => edge.id)
          setSelectedNodeIds(nextNodeIds)
          setSelectedEdgeIds(nextEdgeIds)
          setOpenEdgePopoverId(null)

          if (nextNodeIds.length === 1 && nextEdgeIds.length === 0) {
            onSelectionChange({ nodeId: nextNodeIds[0], edgeId: null, dataObjectId: null })
            return
          }

          if (nextNodeIds.length === 0 && nextEdgeIds.length === 1) {
            onSelectionChange({ nodeId: null, edgeId: nextEdgeIds[0], dataObjectId: null })
            return
          }

          onSelectionChange({ nodeId: null, edgeId: null, dataObjectId: null })
        }}
        onSelectionEnd={() => {
          if (!isLassoSelectionRef.current) {
            return
          }

          isLassoSelectionRef.current = false
          window.requestAnimationFrame(() => {
            setSelectionActionMenu(getSelectionActionMenuPosition(selectedNodeIdsRef.current))
          })
        }}
        onConnectEnd={handleConnectEnd}
        onNodesChange={(changes: NodeChange[]) => {
          setRenderNodes((current) => applyNodeChanges(changes, current))
        }}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={(_, edge) => {
          setSelectedNodeIds([])
          setSelectedEdgeIds([edge.id])
          setOpenEdgePopoverId(null)
          setSelectionActionMenu(null)
          onSelectionChange({ nodeId: null, edgeId: edge.id, dataObjectId: null })
        }}
        onNodeClick={(_, node) => {
          setSelectedEdgeIds([])
          setSelectedNodeIds([node.id])
          setOpenEdgePopoverId(null)
          setSelectionActionMenu(null)
          onSelectionChange({ nodeId: node.id, edgeId: null, dataObjectId: null })
        }}
        onPaneClick={() => {
          interruptFocusAnimation()
          setSelectedNodeIds([])
          setSelectedEdgeIds([])
          setOpenEdgePopoverId(null)
          setSelectionActionMenu(null)
          onSelectionChange({ nodeId: null, edgeId: null, dataObjectId: null })
        }}
        onNodesDelete={(deletedNodes) => {
          if (deletedNodes.length === 0) {
            return
          }

          setSelectedNodeIds((current) => current.filter((id) => !deletedNodes.some((node) => node.id === id)))
          onSelectionChange({ nodeId: null, edgeId: null, dataObjectId: null })
          onDeleteSelection({
            nodeIds: deletedNodes.map((node) => node.id),
            edgeIds: [],
          })
        }}
        onEdgesDelete={(deletedEdges) => {
          if (deletedEdges.length === 0) {
            return
          }

          setSelectedEdgeIds((current) => current.filter((id) => !deletedEdges.some((edge) => edge.id === id)))
          setOpenEdgePopoverId((current) => (current && deletedEdges.some((edge) => edge.id === current) ? null : current))
          onSelectionChange({ nodeId: null, edgeId: null, dataObjectId: null })
          onDeleteEdges(deletedEdges.map((edge) => edge.id))
        }}
      >
        <Background color="rgba(88, 115, 137, 0.22)" gap={28} size={1.2} />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  )
}
