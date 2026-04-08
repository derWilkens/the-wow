import type { Activity, CanvasEdge, CanvasObject, EdgeDataObject, WorkflowSipocRow } from '../../types'

export function getReusableDataObjectsForEdge(canvasObjects: CanvasObject[], edgeId: string) {
  return canvasObjects
    .filter((canvasObject): canvasObject is EdgeDataObject => canvasObject.object_type === 'datenobjekt')
    .filter((canvasObject) => canvasObject.edge_id !== edgeId)
    .sort((left, right) => left.name.localeCompare(right.name, 'de'))
}

export function deriveActivityDataObjects(activity: Activity, canvasEdges: CanvasEdge[], canvasObjects: CanvasObject[]) {
  const edgeDataObjects = canvasObjects.filter(
    (canvasObject): canvasObject is EdgeDataObject => canvasObject.object_type === 'datenobjekt',
  )

  const incomingEdgeIds = new Set(
    canvasEdges.filter((edge) => edge.to_node_type === 'activity' && edge.to_node_id === activity.id).map((edge) => edge.id),
  )
  const outgoingEdgeIds = new Set(
    canvasEdges.filter((edge) => edge.from_node_type === 'activity' && edge.from_node_id === activity.id).map((edge) => edge.id),
  )

  const incoming = edgeDataObjects.filter((canvasObject) => incomingEdgeIds.has(canvasObject.edge_id))
  const outgoing = edgeDataObjects.filter((canvasObject) => outgoingEdgeIds.has(canvasObject.edge_id))

  return {
    incoming,
    outgoing,
  }
}

function dedupeLabels(labels: string[]) {
  return Array.from(new Set(labels.filter(Boolean))).sort((left, right) => left.localeCompare(right, 'de'))
}

function getTransportModeLabel(edge: CanvasEdge) {
  return edge.transport_mode?.label ?? '—'
}

function getRoleLabel(activityId: string, activityRolesById: Record<string, string>) {
  return activityRolesById[activityId] ?? 'Nicht zugeordnet'
}

export function deriveWorkflowSipocRows(
  activities: Activity[],
  canvasEdges: CanvasEdge[],
  canvasObjects: CanvasObject[],
  activityRolesById: Record<string, string>,
): WorkflowSipocRow[] {
  const edgeDataObjects = canvasObjects.filter(
    (canvasObject): canvasObject is EdgeDataObject => canvasObject.object_type === 'datenobjekt',
  )
  const edgeDataObjectsByEdgeId = new Map<string, EdgeDataObject[]>()

  for (const canvasObject of edgeDataObjects) {
    const current = edgeDataObjectsByEdgeId.get(canvasObject.edge_id) ?? []
    current.push(canvasObject)
    current.sort((left, right) => left.edge_sort_order - right.edge_sort_order)
    edgeDataObjectsByEdgeId.set(canvasObject.edge_id, current)
  }

  return activities
    .filter((activity) => activity.node_type === 'activity')
    .sort((left, right) => {
      if (left.position_y !== right.position_y) {
        return left.position_y - right.position_y
      }
      return left.position_x - right.position_x
    })
    .map((activity) => {
      const incomingEdges = canvasEdges.filter((edge) => edge.to_node_type === 'activity' && edge.to_node_id === activity.id)
      const outgoingEdges = canvasEdges.filter((edge) => edge.from_node_type === 'activity' && edge.from_node_id === activity.id)

      const supplierRoleLabels = dedupeLabels(
        incomingEdges
          .filter((edge) => edge.from_node_type === 'activity')
          .map((edge) => getRoleLabel(edge.from_node_id, activityRolesById)),
      )

      const consumerRoleLabels = dedupeLabels(
        outgoingEdges
          .filter((edge) => edge.to_node_type === 'activity')
          .map((edge) => getRoleLabel(edge.to_node_id, activityRolesById)),
      )

      const inputs = incomingEdges.flatMap((edge) =>
        (edgeDataObjectsByEdgeId.get(edge.id) ?? []).map((canvasObject) => ({
          edgeId: edge.id,
          objectName: canvasObject.name,
          transportModeLabel: getTransportModeLabel(edge),
        })),
      )

      const outputs = outgoingEdges.flatMap((edge) =>
        (edgeDataObjectsByEdgeId.get(edge.id) ?? []).map((canvasObject) => ({
          edgeId: edge.id,
          objectName: canvasObject.name,
          transportModeLabel: getTransportModeLabel(edge),
        })),
      )

      return {
        activityId: activity.id,
        processLabel: activity.label,
        processRoleLabel: getRoleLabel(activity.id, activityRolesById),
        supplierRoleLabels,
        consumerRoleLabels,
        inputs,
        outputs,
      }
    })
}
