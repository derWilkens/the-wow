import { ChevronDown, ChevronsDown, ChevronsUp, X } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { HierarchyPreviewCanvas } from './HierarchyPreviewCanvas'
import type { Activity, CanvasEdge, CanvasObject, HierarchyFocusSession, HierarchyFocusState } from '../../types'

function getRectForState(session: HierarchyFocusSession, phase: HierarchyFocusState, collapseFromMaximized: boolean) {
  if (phase === 'expanding') {
    return session.rects.originRect
  }
  if (phase === 'maximizing') {
    return session.rects.previewRect
  }
  if (phase === 'minimizing') {
    return session.rects.maximizedRect
  }
  if (phase === 'collapsing') {
    return collapseFromMaximized ? session.rects.maximizedRect : session.rects.previewRect
  }
  if (phase === 'maximized') {
    return session.rects.maximizedRect
  }
  return session.rects.previewRect
}

function getTargetRectForState(session: HierarchyFocusSession, phase: HierarchyFocusState) {
  if (phase === 'expanding') {
    return session.rects.previewRect
  }
  if (phase === 'maximizing') {
    return session.rects.maximizedRect
  }
  if (phase === 'minimizing') {
    return session.rects.previewRect
  }
  if (phase === 'collapsing') {
    return session.rects.originRect
  }
  if (phase === 'maximized') {
    return session.rects.maximizedRect
  }
  return session.rects.previewRect
}

export function HierarchyFocusOverlay({
  session,
  phase,
  activities,
  canvasObjects,
  canvasEdges,
  onMaximize,
  onMinimize,
  onCollapse,
  collapseFromMaximized = false,
}: {
  session: HierarchyFocusSession
  phase: HierarchyFocusState
  activities: Activity[]
  canvasObjects: CanvasObject[]
  canvasEdges: CanvasEdge[]
  onMaximize: () => void
  onMinimize: () => void
  onCollapse: () => void
  collapseFromMaximized?: boolean
}) {
  if (phase === 'collapsed') {
    return null
  }

  if (phase === 'maximized') {
    return (
      <div data-testid="hierarchy-focus-overlay" className="wow-hierarchy-focus-overlay wow-hierarchy-focus-overlay--maximized">
        <button
          type="button"
          data-testid="hierarchy-focus-minimize"
          className="wow-hierarchy-focus-floating-button"
          onClick={onMinimize}
        >
          <ChevronsDown className="h-4 w-4" />
          Minimieren
        </button>
      </div>
    )
  }

  const rect = getTargetRectForState(session, phase)
  const initialRect = getRectForState(session, phase, collapseFromMaximized)
  const [displayRect, setDisplayRect] = useState(initialRect)
  const isInteractive = phase === 'expanded'
  const isExpanded = phase === 'expanded'
  const scrimOpacity = phase === 'collapsing' ? 0.08 : 0.38

  useEffect(() => {
    setDisplayRect(initialRect)
    const frame = window.requestAnimationFrame(() => {
      setDisplayRect(rect)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [initialRect.height, initialRect.width, initialRect.x, initialRect.y, rect.height, rect.width, rect.x, rect.y])

  return (
    <div
      data-testid="hierarchy-focus-overlay"
      className="wow-hierarchy-focus-overlay"
      aria-hidden={!isInteractive}
    >
      <div
        className={`wow-hierarchy-focus-overlay__scrim ${isExpanded ? 'wow-hierarchy-focus-overlay__scrim--blurred' : ''}`}
        style={{ opacity: scrimOpacity }}
      />
      <div
        data-testid="hierarchy-focus-card"
        className={`wow-hierarchy-focus-card ${isInteractive ? 'wow-hierarchy-focus-card--interactive' : ''}`}
        style={{
          left: `${displayRect.x}px`,
          top: `${displayRect.y}px`,
          width: `${displayRect.width}px`,
          height: `${displayRect.height}px`,
        } as CSSProperties}
      >
        <div className="wow-hierarchy-focus-card__header">
          <div>
            <p className="wow-hierarchy-focus-card__eyebrow">Hierarchischer Fokus</p>
            <h2 className="wow-hierarchy-focus-card__title">{session.originActivityLabel}</h2>
            <p className="wow-hierarchy-focus-card__subtitle">{session.childWorkspaceName}</p>
          </div>
          {isInteractive ? (
            <div className="wow-hierarchy-focus-card__actions">
              <button
                type="button"
                data-testid="hierarchy-focus-collapse"
                className="wow-hierarchy-focus-card__button wow-hierarchy-focus-card__button--secondary"
                onClick={onCollapse}
              >
                <X className="h-4 w-4" />
                Collapse
              </button>
              <button
                type="button"
                data-testid="hierarchy-focus-maximize"
                className="wow-hierarchy-focus-card__button wow-hierarchy-focus-card__button--primary"
                onClick={onMaximize}
              >
                <ChevronsUp className="h-4 w-4" />
                Maximize
              </button>
            </div>
          ) : (
            <div className="wow-hierarchy-focus-card__phase">
              {phase === 'minimizing' ? <ChevronDown className="h-4 w-4" /> : <ChevronsUp className="h-4 w-4" />}
            </div>
          )}
        </div>
        <div className="wow-hierarchy-focus-card__body">
          <HierarchyPreviewCanvas
            activities={activities}
            canvasObjects={canvasObjects}
            canvasEdges={canvasEdges}
            previewLayout={session.previewLayout}
          />
        </div>
      </div>
    </div>
  )
}
