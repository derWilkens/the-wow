import type { WorkflowSipocRow } from '../../types'

function renderRoleCell(labels: string[]) {
  if (labels.length === 0) {
    return <span className="text-slate-500">Nicht zugeordnet</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-100"
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function renderObjectCell(items: WorkflowSipocRow['inputs']) {
  if (items.length === 0) {
    return <span className="text-slate-500">—</span>
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={`${item.edgeId}-${item.objectName}-${index}`} className="text-sm text-slate-100">
          <span>{item.objectName}</span>
          <span className="text-slate-500"> — </span>
          <span className="text-slate-300">{item.transportModeLabel}</span>
        </li>
      ))}
    </ul>
  )
}

export function WorkflowSipocTable({
  rows,
  onSelectActivity,
}: {
  rows: WorkflowSipocRow[]
  onSelectActivity?: (activityId: string) => void
}) {
  return (
    <div
      data-testid="workflow-sipoc-table"
      className="h-full overflow-auto rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,20,31,0.92),rgba(6,14,22,0.96))] p-4"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">SIPOC</p>
          <h2 className="mt-2 font-display text-xl text-white">Tabellarische View</h2>
        </div>
        <p className="text-sm text-slate-400">Eine Zeile pro Aktivitaet, abgeleitet aus dem bestehenden Workflow-Modell.</p>
      </div>

      <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-[22px]">
        <thead>
          <tr className="bg-white/[0.04] text-left text-[11px] uppercase tracking-[0.22em] text-slate-400">
            <th className="px-4 py-3">Supplier</th>
            <th className="px-4 py-3">Input</th>
            <th className="px-4 py-3">Prozess</th>
            <th className="px-4 py-3">Prozessrolle</th>
            <th className="px-4 py-3">Output</th>
            <th className="px-4 py-3">Consumer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.activityId}
              data-testid={`sipoc-row-${row.activityId}`}
              className="align-top text-sm text-slate-200 transition hover:bg-white/[0.03]"
            >
              <td className="border-t border-white/10 px-4 py-4">{renderRoleCell(row.supplierRoleLabels)}</td>
              <td className="border-t border-white/10 px-4 py-4">{renderObjectCell(row.inputs)}</td>
              <td className="border-t border-white/10 px-4 py-4">
                {onSelectActivity ? (
                  <button
                    type="button"
                    data-testid={`sipoc-process-${row.activityId}`}
                    onClick={() => onSelectActivity(row.activityId)}
                    className="text-left font-medium text-cyan-200 transition hover:text-cyan-100"
                  >
                    {row.processLabel}
                  </button>
                ) : (
                  <span data-testid={`sipoc-process-${row.activityId}`} className="font-medium text-cyan-200">
                    {row.processLabel}
                  </span>
                )}
              </td>
              <td className="border-t border-white/10 px-4 py-4">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-100">
                  {row.processRoleLabel}
                </span>
              </td>
              <td className="border-t border-white/10 px-4 py-4">{renderObjectCell(row.outputs)}</td>
              <td className="border-t border-white/10 px-4 py-4">{renderRoleCell(row.consumerRoleLabels)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
