import type { Activity, CanvasEdge, CanvasObject, EdgeDataObject } from '../../types'

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
