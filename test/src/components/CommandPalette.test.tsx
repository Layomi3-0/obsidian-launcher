import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommandPalette, filterCommands, SLASH_COMMANDS } from '@/components/CommandPalette'

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

describe('filterCommands', () => {
  it('returns all commands when filter is empty', () => {
    const result = filterCommands('')
    expect(result).toEqual(SLASH_COMMANDS)
  })

  it('returns all commands when filter is just a slash', () => {
    const result = filterCommands('/')
    expect(result).toEqual(SLASH_COMMANDS)
  })

  it('filters by label prefix', () => {
    const result = filterCommands('/bri')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('/briefing')
  })

  it('filters by description content', () => {
    const result = filterCommands('/morning')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('/briefing')
  })

  it('returns empty array when no match', () => {
    const result = filterCommands('/zzzznonexistent')
    expect(result).toHaveLength(0)
  })

  it('is case insensitive', () => {
    const result = filterCommands('/HISTORY')
    expect(result.some(c => c.name === '/history')).toBe(true)
  })
})

describe('CommandPalette', () => {
  const defaultProps = {
    filter: '',
    selectedIndex: 0,
    onSelect: vi.fn(),
  }

  it('renders all commands when filter is empty', () => {
    render(<CommandPalette {...defaultProps} />)

    for (const cmd of SLASH_COMMANDS) {
      expect(screen.getByText(cmd.name)).toBeInTheDocument()
    }
  })

  it('renders filtered commands', () => {
    render(<CommandPalette {...defaultProps} filter="/cap" />)

    expect(screen.getByText('/capture')).toBeInTheDocument()
    expect(screen.queryByText('/briefing')).not.toBeInTheDocument()
  })

  it('highlights selected command with different background', () => {
    render(<CommandPalette {...defaultProps} selectedIndex={0} />)

    const firstCommand = screen.getByText(SLASH_COMMANDS[0].name).closest('div[style]')
    expect(firstCommand).toBeTruthy()
    // The selected item has a purple-tinted background
    expect((firstCommand as HTMLElement).style.background).toContain('rgba(168, 140, 255, 0.1)')
  })

  it('does not highlight unselected commands', () => {
    render(<CommandPalette {...defaultProps} selectedIndex={0} />)

    const secondCommand = screen.getByText(SLASH_COMMANDS[1].name).closest('div[style*="cursor"]')
    expect((secondCommand as HTMLElement).style.background).toBe('transparent')
  })

  it('calls onSelect when a command is clicked', () => {
    const onSelect = vi.fn()
    render(<CommandPalette {...defaultProps} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('/briefing'))

    expect(onSelect).toHaveBeenCalledWith(SLASH_COMMANDS[0])
  })

  it('renders command descriptions', () => {
    render(<CommandPalette {...defaultProps} />)

    expect(screen.getByText('Morning briefing with tasks and priorities')).toBeInTheDocument()
    expect(screen.getByText('Browse and resume previous conversations')).toBeInTheDocument()
  })

  it('returns null when no commands match', () => {
    const { container } = render(<CommandPalette {...defaultProps} filter="/zzzznothing" />)

    expect(container.firstChild).toBeNull()
  })
})
