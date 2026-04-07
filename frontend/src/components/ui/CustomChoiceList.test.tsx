import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CustomChoiceList, type CustomChoiceOption } from './CustomChoiceList'

const options: CustomChoiceOption[] = [
  {
    id: 'opt-1',
    label: 'Direkt',
    description: 'Direkte Uebergabe ohne Zwischenschritt.',
    badges: ['Standard'],
  },
  {
    id: 'opt-2',
    label: 'Mail',
    description: 'Versand an die naechste Stelle.',
  },
]

describe('CustomChoiceList', () => {
  it('renders labels, descriptions and badges and selects an option', () => {
    const onSelect = vi.fn()

    render(
      <CustomChoiceList
        testId="choice"
        value=""
        options={options}
        placeholder="Bitte auswaehlen"
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByTestId('choice-trigger'))

    expect(screen.getByTestId('choice-option-opt-1')).toHaveTextContent('Direkt')
    expect(screen.getByTestId('choice-option-opt-1')).toHaveTextContent('Direkte Uebergabe ohne Zwischenschritt.')
    expect(screen.getByTestId('choice-option-opt-1')).toHaveTextContent('Standard')

    fireEvent.click(screen.getByTestId('choice-option-opt-2'))
    expect(onSelect).toHaveBeenCalledWith('opt-2')
    expect(screen.queryByTestId('choice-panel')).not.toBeInTheDocument()
  })

  it('filters options via search and supports a clear value', () => {
    const onSelect = vi.fn()

    render(
      <CustomChoiceList
        testId="choice"
        value="opt-1"
        options={options}
        placeholder="Bitte auswaehlen"
        allowClear
        searchable
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByTestId('choice-trigger'))
    fireEvent.change(screen.getByTestId('choice-search'), {
      target: { value: 'Mail' },
    })

    expect(screen.getByTestId('choice-option-opt-2')).toBeInTheDocument()
    expect(screen.queryByTestId('choice-option-opt-1')).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId('choice-search'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByTestId('choice-clear'))
    expect(onSelect).toHaveBeenCalledWith('')
  })

  it('closes on outside click and escape', () => {
    render(
      <div>
        <button data-testid="outside">Outside</button>
        <CustomChoiceList
          testId="choice"
          value=""
          options={options}
          placeholder="Bitte auswaehlen"
          onSelect={vi.fn()}
        />
      </div>,
    )

    fireEvent.click(screen.getByTestId('choice-trigger'))
    expect(screen.getByTestId('choice-panel')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByTestId('choice-panel')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('choice-trigger'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('choice-panel')).not.toBeInTheDocument()
  })

  it('creates a new option inline and selects it', async () => {
    const onSelect = vi.fn()
    const onCreate = vi.fn().mockResolvedValue({
      id: 'opt-3',
      label: 'Im Datenspeicher bereitgestellt',
      description: 'Zwischenspeicherung bis zur weiteren Bearbeitung.',
      badges: ['Standard'],
    } satisfies CustomChoiceOption)

    render(
      <CustomChoiceList
        testId="choice"
        value=""
        options={options}
        placeholder="Bitte auswaehlen"
        creatable
        createLabel="Transportmodus anlegen"
        createFlagLabel="Als Standard markieren"
        onSelect={onSelect}
        onCreate={onCreate}
      />,
    )

    fireEvent.click(screen.getByTestId('choice-trigger'))
    fireEvent.click(screen.getByTestId('choice-create-toggle'))
    fireEvent.change(screen.getByTestId('choice-create-name'), {
      target: { value: 'Im Datenspeicher bereitgestellt' },
    })
    fireEvent.change(screen.getByTestId('choice-create-description'), {
      target: { value: 'Zwischenspeicherung bis zur weiteren Bearbeitung.' },
    })
    fireEvent.click(screen.getByTestId('choice-create-flag'))
    fireEvent.click(screen.getByTestId('choice-create-submit'))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        label: 'Im Datenspeicher bereitgestellt',
        description: 'Zwischenspeicherung bis zur weiteren Bearbeitung.',
        flag: true,
      })
      expect(onSelect).toHaveBeenCalledWith('opt-3')
    })
  })
})
