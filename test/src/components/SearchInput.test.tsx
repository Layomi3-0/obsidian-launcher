import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SearchInput } from '@/components/SearchInput'

beforeEach(() => {
  window.launcher = undefined as any
})

describe('SearchInput', () => {
  const defaultProps = {
    query: '',
    mode: 'idle' as const,
    onQueryChange: vi.fn(),
    onKeyDown: vi.fn(),
  }

  it('renders textarea with placeholder', () => {
    render(<SearchInput {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Search notes, ask anything...')
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('shows AI badge in AI mode', () => {
    render(<SearchInput {...defaultProps} mode="ai" />)

    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('does not show AI badge in non-AI mode', () => {
    render(<SearchInput {...defaultProps} mode="local" />)

    expect(screen.queryByText('AI')).not.toBeInTheDocument()
  })

  it('shows AI placeholder in AI mode', () => {
    render(<SearchInput {...defaultProps} mode="ai" />)

    expect(screen.getByPlaceholderText('Ask anything...')).toBeInTheDocument()
  })

  it('shows search placeholder in non-AI mode', () => {
    render(<SearchInput {...defaultProps} mode="local" />)

    expect(screen.getByPlaceholderText('Search notes, ask anything...')).toBeInTheDocument()
  })

  it('calls onQueryChange on input', () => {
    const onQueryChange = vi.fn()
    render(<SearchInput {...defaultProps} onQueryChange={onQueryChange} />)

    const textarea = screen.getByPlaceholderText('Search notes, ask anything...')
    fireEvent.change(textarea, { target: { value: 'hello' } })

    expect(onQueryChange).toHaveBeenCalledWith('hello')
  })

  it('calls onKeyDown on key press', () => {
    const onKeyDown = vi.fn()
    render(<SearchInput {...defaultProps} onKeyDown={onKeyDown} />)

    const textarea = screen.getByPlaceholderText('Search notes, ask anything...')
    fireEvent.keyDown(textarea, { key: 'ArrowDown' })

    expect(onKeyDown).toHaveBeenCalled()
  })

  it('prevents default on Enter key', () => {
    const onKeyDown = vi.fn()
    render(<SearchInput {...defaultProps} onKeyDown={onKeyDown} />)

    const textarea = screen.getByPlaceholderText('Search notes, ask anything...')
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    textarea.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('renders with provided query value', () => {
    render(<SearchInput {...defaultProps} query="test query" />)

    const textarea = screen.getByDisplayValue('test query')
    expect(textarea).toBeInTheDocument()
  })
})
