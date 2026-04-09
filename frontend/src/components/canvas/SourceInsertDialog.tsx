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
        className="wow-surface-dialog w-full max-w-xl rounded-[28px] border border-white/10 p-6 shadow-[0_40px_120px_rgba(2,8,12,0.72)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">Datenspeicher</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Datenspeicher einfuegen</h2>
            <p className="mt-2 text-sm text-slate-400">
              Du kannst einen bestehenden Datenspeicher aus diesem Arbeitsablauf als Vorlage verwenden oder einen neuen Datenspeicher anlegen.
            </p>
          </div>
          <button
            type="button"
            data-testid="source-insert-close"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"
            onClick={onClose}
          >
            Schliessen
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Bestehenden verwenden</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Es wird ein neuer Knoten mit dem Namen des gewaelten Datenspeichers eingefuegt.
                </p>
              </div>
              <button
                type="button"
                data-testid="source-insert-use-existing"
                disabled={!hasExistingSources || !selectedSourceId || isSubmitting}
                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/14 px-4 py-3 text-sm font-medium text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
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
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        isSelected
                          ? 'border-cyan-300/50 bg-cyan-400/14 text-cyan-50'
                          : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20'
                      }`}
                      onClick={() => setSelectedSourceId(source.id)}
                    >
                      <span>{source.name}</span>
                      {isSelected ? <span className="text-xs uppercase tracking-[0.2em] text-cyan-200/90">Aktiv</span> : null}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p
                data-testid="source-insert-empty"
                className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-400"
              >
                In diesem Arbeitsablauf gibt es noch keinen bestehenden Datenspeicher.
              </p>
            )}
          </section>

          <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Neuen Datenspeicher anlegen</h3>
                <p className="mt-1 text-sm text-slate-400">Es wird ein neuer Datenspeicher mit dem Standardnamen eingefuegt.</p>
              </div>
              <button
                type="button"
                data-testid="source-insert-create-new"
                disabled={isSubmitting}
                className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={onCreateNew}
              >
                Neu anlegen
              </button>
            </div>
            {selectedSourceName ? (
              <p className="mt-3 text-xs text-slate-500">Aktuell ausgewaehlte Vorlage: {selectedSourceName}</p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
