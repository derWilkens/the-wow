import { useMemo, useState } from 'react'
import { Plus, Save, Trash2, X } from 'lucide-react'
import type { CanvasObject, FieldType, UpsertCanvasObjectInput } from '../../types'

const fieldTypes: FieldType[] = ['text', 'integer', 'decimal', 'date', 'boolean']

export function DataObjectPopup({
  canvasObject,
  onClose,
  onSave,
  onDelete,
}: {
  canvasObject: CanvasObject
  onClose: () => void
  onSave: (input: UpsertCanvasObjectInput) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
}) {
  const [name, setName] = useState(canvasObject.name)
  const [fields, setFields] = useState(canvasObject.fields ?? [])
  const isDataObject = canvasObject.object_type === 'datenobjekt'
  const title = isDataObject ? 'Datenobjekt' : 'Datenspeicher'
  const eyebrow = isDataObject ? 'Live schema' : 'Informationsspeicher'
  const actionLabel = isDataObject ? 'Datenobjekt löschen' : 'Datenspeicher löschen'

  const normalizedFields = useMemo(
    () => fields.map((field, index) => ({ ...field, sort_order: index })),
    [fields],
  )

  function handleSave() {
    onClose()
    void onSave({
      id: canvasObject.id,
      parent_activity_id: canvasObject.parent_activity_id,
      object_type: canvasObject.object_type,
      name,
      edge_id: canvasObject.object_type === 'datenobjekt' ? canvasObject.edge_id : null,
      edge_sort_order: canvasObject.object_type === 'datenobjekt' ? canvasObject.edge_sort_order : null,
      position_x: canvasObject.object_type === 'quelle' ? canvasObject.position_x : undefined,
      position_y: canvasObject.object_type === 'quelle' ? canvasObject.position_y : undefined,
      fields: isDataObject ? normalizedFields : undefined,
    })
  }

  function handleDelete() {
    onClose()
    void onDelete(canvasObject.id)
  }

  return (
    <div
      data-testid="data-object-overlay"
      className="wow-overlay-scrim pointer-events-auto absolute inset-0 flex items-start justify-end p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        data-testid={`data-object-detail-${canvasObject.id}`}
        className="wow-surface-dialog pointer-events-auto w-full max-w-md rounded-[26px] border border-white/10 p-5 shadow-[0_30px_90px_rgba(2,8,12,0.6)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300/80">{title}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
            <input data-testid="data-object-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-display text-2xl text-white outline-none" />
          </div>
          <button data-testid="data-object-close" onClick={onClose} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isDataObject ? (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id ?? index} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-200">
                <input data-testid={`data-object-field-name-${index}`} value={field.name} onChange={(event) => setFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white outline-none" />
                <select value={field.field_type} onChange={(event) => setFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, field_type: event.target.value as FieldType } : item))} className="rounded-xl border border-white/10 bg-slate-950/50 px-2 py-2 text-white outline-none">
                  {fieldTypes.map((fieldType) => <option key={fieldType} value={fieldType}>{fieldType}</option>)}
                </select>
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={field.required} onChange={(event) => setFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, required: event.target.checked } : item))} /> Pflichtfeld
                </label>
                <button onClick={() => setFields((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-full border border-rose-400/25 bg-rose-500/10 p-2 text-rose-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button data-testid="data-object-add-field" onClick={() => setFields((current) => [...current, { object_id: canvasObject.id, name: `feld_${current.length + 1}`, field_type: 'text', required: false, sort_order: current.length }])} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">
              <Plus className="h-4 w-4" /> Feld hinzufuegen
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-50">
            Datenspeicher beschreiben, wo Informationen abgelegt oder bereitgestellt werden. Vergib einen klaren Namen, damit spätere Prüf- oder Transformationsschritte nachvollziehbar bleiben.
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <button data-testid="data-object-delete" onClick={handleDelete} className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <Trash2 className="h-4 w-4" /> {actionLabel}
          </button>
          <button data-testid="data-object-save" onClick={handleSave} className="inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">
            <Save className="h-4 w-4" /> Speichern
          </button>
        </div>
      </div>
    </div>
  )
}
