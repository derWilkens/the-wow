import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'

export interface CustomChoiceOption {
  id: string
  label: string
  description?: string | null
  badges?: string[]
  disabled?: boolean
  meta?: unknown
}

interface CustomChoiceCreateInput {
  label: string
  description: string
  flag: boolean
  tertiary?: string
}

export function CustomChoiceList({
  testId,
  value,
  options,
  placeholder,
  allowClear = false,
  clearLabel = 'Nicht festgelegt',
  clearDescription = 'Es wird kein Katalogwert gesetzt.',
  searchable = false,
  searchPlaceholder = 'Suchen',
  creatable = false,
  createLabel = 'Neu anlegen',
  createPrimaryLabel = 'Bezeichnung',
  createPrimaryPlaceholder = 'Bezeichnung',
  createSecondaryLabel = 'Beschreibung',
  createSecondaryPlaceholder = 'Optional: Beschreibung',
  createFlagLabel,
  renderCreateForm,
  emptyState = 'Keine Eintraege vorhanden.',
  autoSelectCreated = true,
  onSelect,
  onCreate,
}: {
  testId: string
  value: string
  options: CustomChoiceOption[]
  placeholder: string
  allowClear?: boolean
  clearLabel?: string
  clearDescription?: string
  searchable?: boolean
  searchPlaceholder?: string
  creatable?: boolean
  createLabel?: string
  createPrimaryLabel?: string
  createPrimaryPlaceholder?: string
  createSecondaryLabel?: string
  createSecondaryPlaceholder?: string
  createFlagLabel?: string
  renderCreateForm?: (input: {
    label: string
    description: string
    flag: boolean
    tertiary: string
    isCreating: boolean
    setLabel: (value: string) => void
    setDescription: (value: string) => void
    setFlag: (value: boolean) => void
    setTertiary: (value: string) => void
    submit: () => void
    cancel: () => void
    testId: string
  }) => React.ReactNode
  emptyState?: string
  autoSelectCreated?: boolean
  onSelect: (id: string) => void
  onCreate?: (input: CustomChoiceCreateInput) => Promise<CustomChoiceOption | void> | CustomChoiceOption | void
}) {
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const createInputRef = useRef<HTMLInputElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createLabelValue, setCreateLabelValue] = useState('')
  const [createDescriptionValue, setCreateDescriptionValue] = useState('')
  const [createFlagValue, setCreateFlagValue] = useState(false)
  const [createTertiaryValue, setCreateTertiaryValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const selectedOption = options.find((option) => option.id === value) ?? null
  const normalizedSearch = search.trim().toLocaleLowerCase('de')
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) {
      return options
    }

    return options.filter((option) => {
      const searchableText = [option.label, option.description ?? '', ...(option.badges ?? [])]
        .join(' ')
        .toLocaleLowerCase('de')
      return searchableText.includes(normalizedSearch)
    })
  }, [normalizedSearch, options])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreateOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setIsCreateOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setIsCreateOpen(false)
      return
    }

    if (searchable) {
      window.setTimeout(() => searchInputRef.current?.focus(), 0)
      return
    }

    if (creatable) {
      window.setTimeout(() => createInputRef.current?.focus(), 0)
    }
  }, [creatable, isOpen, searchable])

  function handleSelect(id: string) {
    onSelect(id)
    setIsOpen(false)
    setIsCreateOpen(false)
    setSearch('')
  }

  async function handleCreate() {
    if (!onCreate || !createLabelValue.trim()) {
      return
    }

    setIsCreating(true)
    try {
      const createdOption = await onCreate({
        label: createLabelValue.trim(),
        description: createDescriptionValue.trim(),
        flag: createFlagValue,
        tertiary: createTertiaryValue.trim(),
      })
      if (createdOption?.id && autoSelectCreated) {
        onSelect(createdOption.id)
      }
      setCreateLabelValue('')
      setCreateDescriptionValue('')
      setCreateFlagValue(false)
      setCreateTertiaryValue('')
      setIsOpen(false)
      setIsCreateOpen(false)
      setSearch('')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid={`${testId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="wow-ui-input flex items-center justify-between gap-3 border-[var(--wow-panel-border)] bg-[var(--panel-strong)] px-4 py-3 text-left shadow-none transition hover:bg-[var(--wow-secondary-soft)] focus:border-[var(--wow-primary)]"
      >
        <span className="min-w-0">
          <span className={`block truncate text-sm font-medium ${selectedOption ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
            {selectedOption?.label ?? placeholder}
          </span>
          {selectedOption?.description ? (
            <span className="mt-1 block truncate text-xs text-[var(--muted)]">{selectedOption.description}</span>
          ) : null}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--muted)] transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen ? (
        <div
          id={panelId}
          data-testid={`${testId}-panel`}
          className="wow-surface-popover absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-[var(--wow-panel-radius)] border border-[var(--wow-panel-border)] shadow-[var(--wow-panel-shadow)]"
        >
          <div className="space-y-3 p-3">
            {searchable ? (
              <label className="wow-ui-section flex items-center gap-2 px-3 py-2 text-[var(--text)]">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  ref={searchInputRef}
                  data-testid={`${testId}-search`}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                />
              </label>
            ) : null}

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {allowClear ? (
                <button
                  type="button"
                  data-testid={`${testId}-clear`}
                  onClick={() => handleSelect('')}
                  className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    value === ''
                      ? 'border-[var(--wow-primary)] bg-[var(--wow-primary-soft)] text-[var(--wow-primary)]'
                      : 'border-[var(--wow-panel-border)] bg-[var(--panel-strong)] text-[var(--text)] hover:bg-[var(--wow-secondary-soft)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{clearLabel}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{clearDescription}</div>
                  </div>
                  {value === '' ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--wow-primary)]" /> : null}
                </button>
              ) : null}

              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = option.id === value
                  return (
                    <button
                      key={option.id}
                      type="button"
                      data-testid={`${testId}-option-${option.id}`}
                      disabled={option.disabled}
                      onClick={() => handleSelect(option.id)}
                      className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? 'border-[var(--wow-primary)] bg-[var(--wow-primary-soft)] text-[var(--wow-primary)]'
                          : 'border-[var(--wow-panel-border)] bg-[var(--panel-strong)] text-[var(--text)] hover:bg-[var(--wow-secondary-soft)]'
                      } ${option.disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{option.label}</span>
                          {(option.badges ?? []).map((badge) => (
                            <span
                              key={`${option.id}-${badge}`}
                              className="wow-ui-chip px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                        {option.description ? (
                          <div className="mt-1 text-xs leading-5 text-slate-400">{option.description}</div>
                        ) : null}
                      </div>
                      {isSelected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--wow-primary)]" /> : null}
                    </button>
                  )
                })
              ) : (
                <div
                  data-testid={`${testId}-empty`}
                  className="rounded-[var(--wow-panel-radius)] border border-dashed border-[var(--wow-panel-border)] bg-[var(--panel-strong)] px-3 py-4 text-sm text-[var(--muted)]"
                >
                  {emptyState}
                </div>
              )}
            </div>

            {creatable && onCreate ? (
              <div className="wow-ui-card p-3">
                {!isCreateOpen ? (
                  <button
                    type="button"
                    data-testid={`${testId}-create-toggle`}
                    onClick={() => setIsCreateOpen(true)}
                    className="wow-ui-button-secondary min-h-0 px-3 py-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {createLabel}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="wow-ui-label">{createLabel}</p>
                      <button
                        type="button"
                        data-testid={`${testId}-create-cancel`}
                        onClick={() => {
                          setIsCreateOpen(false)
                          setCreateLabelValue('')
                          setCreateDescriptionValue('')
                          setCreateFlagValue(false)
                          setCreateTertiaryValue('')
                        }}
                        className="wow-ui-icon-button p-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {renderCreateForm ? (
                      renderCreateForm({
                        label: createLabelValue,
                        description: createDescriptionValue,
                        flag: createFlagValue,
                        tertiary: createTertiaryValue,
                        isCreating,
                        setLabel: setCreateLabelValue,
                        setDescription: setCreateDescriptionValue,
                        setFlag: setCreateFlagValue,
                        setTertiary: setCreateTertiaryValue,
                        submit: () => void handleCreate(),
                        cancel: () => {
                          setIsCreateOpen(false)
                          setCreateLabelValue('')
                          setCreateDescriptionValue('')
                          setCreateFlagValue(false)
                          setCreateTertiaryValue('')
                        },
                        testId,
                      })
                    ) : (
                      <>
                        <div className="grid gap-3">
                          <label className="grid gap-1">
                            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{createPrimaryLabel}</span>
                            <input
                              ref={createInputRef}
                              data-testid={`${testId}-create-name`}
                              value={createLabelValue}
                              onChange={(event) => setCreateLabelValue(event.target.value)}
                              placeholder={createPrimaryPlaceholder}
                              className="wow-ui-input"
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{createSecondaryLabel}</span>
                            <textarea
                              data-testid={`${testId}-create-description`}
                              value={createDescriptionValue}
                              onChange={(event) => setCreateDescriptionValue(event.target.value)}
                              rows={2}
                              placeholder={createSecondaryPlaceholder}
                              className="wow-ui-input"
                            />
                          </label>
                          {createFlagLabel ? (
                            <label className="wow-ui-section flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--text)]">
                              <input
                                data-testid={`${testId}-create-flag`}
                                type="checkbox"
                                checked={createFlagValue}
                                onChange={(event) => setCreateFlagValue(event.target.checked)}
                                className="h-4 w-4 rounded border-[var(--wow-panel-border)] bg-[var(--panel-strong)]"
                              />
                              <span>{createFlagLabel}</span>
                            </label>
                          ) : null}
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            data-testid={`${testId}-create-submit`}
                            disabled={!createLabelValue.trim() || isCreating}
                            onClick={() => void handleCreate()}
                            className="wow-ui-button-primary disabled:opacity-40"
                          >
                            {createLabel}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

