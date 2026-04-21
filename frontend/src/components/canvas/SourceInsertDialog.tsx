import { useEffect, useMemo, useState } from 'react'

interface ExistingSourceOption {
  id: string
  name: string
}

export function SourceInsertDialog({
  isOpen,
  existingSources,
  isSubmitting,
  onClose,
  onUseExisting,
  onCreateNew,
}: {
  isOpen: boolean
  existingSources: ExistingSourceOption[]
  isSubmitting: boolean
  onClose: () => void
  onUseExisting: (sourceId: string) => void
  onCreateNew: () => void
}) {
  const [selectedSourceId, setSelectedSourceId] = useState<string>('')
  const hasExistingSources = existingSources.length > 0

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setSelectedSourceId(existingSources[0]?.id ?? '')
  }, [existingSources, isOpen])

  const selectedSourceName = useMemo(
    () => existingSources.find((source) => source.id === selectedSourceId)?.name ?? '',
    [existingSources, selectedSourceId],
  )

  if (!isOpen) {
    return null
  }

  return (
    <div
      data-testid="source-insert-overlay"
      className="wow-overlay-scrim absolute inset-0 z-40 flex items-center justify-center p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        data-testid="source-insert-dialog"
        className="wow-ui-dialog w-full max-w-xl p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="wow-ui-eyebrow">Datenspeicher</p>
            <h2 className="wow-ui-title mt-2">Datenspeicher einfuegen</h2>
            <p className="wow-ui-subtitle mt-2">
              Du kannst einen bestehenden Datenspeicher aus diesem Arbeitsablauf als Vorlage verwenden oder einen neuen Datenspeicher anlegen.
            </p>
          </div>
          <button
            type="button"
            data-testid="source-insert-close"
            className="wow-ui-button-secondary"
            onClick={onClose}
          >
            Schliessen
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <section className="wow-ui-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Bestehenden verwenden</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Es wird ein neuer Knoten mit dem Namen des gewaelten Datenspeichers eingefuegt.
                </p>
              </div>
              <button
                type="button"
                data-testid="source-insert-use-existing"
                disabled={!hasExistingSources || !selectedSourceId || isSubmitting}
                className="wow-ui-button-secondary disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => onUseExisting(selectedSourceId)}
              >
                Verwenden
              </button>
            </div>

            {hasExistingSources ? (
              <div className="mt-4 grid gap-2">
                {existingSources.map((source) => {
                  const isSelected = source.id === selectedSourceId
                  return (
                    <button
                      key={source.id}
                      type="button"
                      data-testid={`source-insert-option-${source.id}`}
                      className={`flex items-center justify-between rounded-[var(--wow-panel-radius)] border px-4 py-3 text-left text-sm transition ${
                        isSelected
                          ? 'border-[var(--wow-primary)] bg-[var(--wow-primary-soft)] text-[var(--wow-primary)]'
                          : 'border-[var(--wow-panel-border)] bg-[var(--panel-strong)] text-[var(--text)] hover:bg-[var(--wow-secondary-soft)]'
                      }`}
                      onClick={() => setSelectedSourceId(source.id)}
                    >
                      <span>{source.name}</span>
                      {isSelected ? <span className="text-xs uppercase tracking-[0.2em] text-[var(--wow-primary)]">Aktiv</span> : null}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p
                data-testid="source-insert-empty"
                className="mt-4 rounded-[var(--wow-panel-radius)] border border-dashed border-[var(--wow-panel-border)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--muted)]"
              >
                In diesem Arbeitsablauf gibt es noch keinen bestehenden Datenspeicher.
              </p>
            )}
          </section>

          <section className="wow-ui-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Neuen Datenspeicher anlegen</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">Es wird ein neuer Datenspeicher mit dem Standardnamen eingefuegt.</p>
              </div>
              <button
                type="button"
                data-testid="source-insert-create-new"
                disabled={isSubmitting}
                className="wow-ui-button-primary disabled:cursor-not-allowed disabled:opacity-40"
                onClick={onCreateNew}
              >
                Neu anlegen
              </button>
            </div>
            {selectedSourceName ? (
              <p className="mt-3 text-xs text-[var(--muted)]">Aktuell ausgewaehlte Vorlage: {selectedSourceName}</p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
