import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from 'reactflow'
import { Database, Plus } from 'lucide-react'
import type { EdgeDataObject } from '../../types'

interface WorkflowEdgeData {
  label?: string | null
  dataObjects: EdgeDataObject[]
  reusableDataObjects: EdgeDataObject[]
  selectedDataObjectId: string | null
  onOpenDataObject: (canvasObject: EdgeDataObject) => void
  onCreateDataObject: () => void
  onAddExistingDataObject: (dataObjectId: string) => void
  isPopoverOpen: boolean
  onTogglePopover: () => void
}

function EdgeDataObjectPopover({
  edgeId,
  dataObjects,
  reusableDataObjects,
  onOpenDataObject,
  onCreateDataObject,
  onAddExistingDataObject,
  onTogglePopover,
}: {
  edgeId: string
  dataObjects: EdgeDataObject[]
  reusableDataObjects: EdgeDataObject[]
  onOpenDataObject: (canvasObject: EdgeDataObject) => void
  onCreateDataObject: () => void
  onAddExistingDataObject: (dataObjectId: string) => void
  onTogglePopover: () => void
}) {
  const filteredReusableDataObjects = reusableDataObjects.filter(
    (candidate) => !dataObjects.some((item) => item.name === candidate.name),
  )

  return (
    <div
      data-testid={`edge-data-object-popover-${edgeId}`}
      className="wow-edge-data-popover"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="wow-edge-data-popover__header">
        <span>Datenobjekte</span>
        <button type="button" onClick={() => onTogglePopover()}>
          Schliessen
        </button>
      </div>
      <div className="wow-edge-data-popover__list">
        {dataObjects.map((canvasObject) => {
          return (
            <div
              key={canvasObject.id}
              data-testid={`edge-data-object-item-${canvasObject.id}`}
              className="wow-edge-data-popover__item"
            >
              <button
                type="button"
                className="wow-edge-data-popover__name"
                onClick={() => onOpenDataObject(canvasObject)}
              >
                {canvasObject.name}
              </button>
            </div>
          )
        })}
      </div>
      <div className="wow-edge-data-popover__footer">
        <button type="button" onClick={onCreateDataObject}>
          <Plus className="h-3.5 w-3.5" />
          Neues Datenobjekt
        </button>
        {filteredReusableDataObjects.length > 0 ? (
          <select
            data-testid={`edge-data-object-existing-select-${edgeId}`}
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) {
                return
              }
              onAddExistingDataObject(event.target.value)
              event.currentTarget.value = ''
            }}
          >
            <option value="">Bestehendes hinzufuegen</option>
            {filteredReusableDataObjects.map((canvasObject) => (
              <option key={canvasObject.id} value={canvasObject.id}>
                {canvasObject.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  )
}

export const WorkflowEdge = memo(function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
  data,
}: EdgeProps<WorkflowEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const dataObjects = data?.dataObjects ?? []
  const selectedDataObjectId = data?.selectedDataObjectId ?? null
  const singleObject = dataObjects[0] ?? null
  const edgeLabel = data?.label?.trim() ?? ''
  const hasEdgeLabel = edgeLabel.length > 0

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {(hasEdgeLabel || dataObjects.length > 0) ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <div className="wow-edge-overlay pointer-events-auto">
              {hasEdgeLabel ? (
                <div data-testid={`edge-label-${id}`} className="wow-edge-label-chip">
                  {edgeLabel}
                </div>
              ) : null}
              {dataObjects.length > 0 ? (
                <div className="wow-edge-data-stack">
                  {dataObjects.length === 1 && singleObject ? (
                    <button
                      key={singleObject.id}
                      type="button"
                      data-testid={`edge-data-object-chip-${singleObject.id}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        data?.onOpenDataObject(singleObject)
                      }}
                      className={`wow-edge-data-chip ${selectedDataObjectId === singleObject.id ? 'wow-edge-data-chip--selected' : ''} ${selected ? 'wow-edge-data-chip--edge-selected' : ''}`}
                    >
                      <Database className="h-3.5 w-3.5" />
                      <span>{singleObject.name}</span>
                    </button>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        data-testid={`edge-data-object-aggregate-${id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          data?.onTogglePopover()
                        }}
                        className={`wow-edge-data-aggregate ${selected ? 'wow-edge-data-aggregate--selected-edge' : ''}`}
                      >
                        <Database className="h-4 w-4" />
                        <span className="wow-edge-data-aggregate__count">{dataObjects.length}</span>
                      </button>
                      {data?.isPopoverOpen ? (
                        <EdgeDataObjectPopover
                          edgeId={id}
                          dataObjects={dataObjects}
                          reusableDataObjects={data?.reusableDataObjects ?? []}
                          onOpenDataObject={(canvasObject) => data?.onOpenDataObject(canvasObject)}
                          onCreateDataObject={() => data?.onCreateDataObject()}
                          onAddExistingDataObject={(dataObjectId) => data?.onAddExistingDataObject(dataObjectId)}
                          onTogglePopover={() => data?.onTogglePopover()}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
})
