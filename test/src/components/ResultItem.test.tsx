import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ResultItem } from '@/components/ResultItem/index'
import type { SearchResult } from '@/lib/types'

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    path: 'notes/engineering/test-note.md',
    title: 'Test Note Title',
    snippet: 'This is a snippet of the note content',
    score: 0.95,
    matchType: 'fuzzy',
    tags: ['engineering', 'project'],
    lastModified: new Date().toISOString(),
    ...overrides,
  }
}

describe('ResultItem', () => {
  const defaultProps = {
    result: makeResult(),
    isSelected: false,
    query: 'test',
    onSelect: vi.fn(),
    onClick: vi.fn(),
  }

  it('renders title', () => {
    render(<ResultItem {...defaultProps} />)

    // The title is split by highlightMatch, so we check parts exist
    expect(screen.getByText('Note Title')).toBeInTheDocument()
  })

  it('renders snippet', () => {
    render(<ResultItem {...defaultProps} />)

    expect(screen.getByText('This is a snippet of the note content')).toBeInTheDocument()
  })

  it('renders tags', () => {
    render(<ResultItem {...defaultProps} />)

    expect(screen.getByText('engineering')).toBeInTheDocument()
    expect(screen.getByText('project')).toBeInTheDocument()
  })

  it('highlights matching text in title', () => {
    render(<ResultItem {...defaultProps} query="Test" />)

    // The highlight function renders matched text in spans with color #a88cff and fontWeight 500
    // jsdom may serialize rgb, so check for the text "Test" inside a span whose style contains the color
    const allSpans = document.querySelectorAll('span')
    const highlighted = Array.from(allSpans).find(
      span => span.textContent === 'Test' && span.getAttribute('style')?.includes('font-weight') && span.getAttribute('style')?.includes('500'),
    )
    expect(highlighted).toBeTruthy()
  })

  it('shows match type indicator dot', () => {
    render(<ResultItem {...defaultProps} result={makeResult({ matchType: 'fulltext' })} />)

    // The dot has the color from MATCH_TYPE_CONFIG and a title attribute
    const dot = document.querySelector('[title="exact"]')
    expect(dot).toBeTruthy()
  })

  it('shows fuzzy match type label', () => {
    render(<ResultItem {...defaultProps} result={makeResult({ matchType: 'fuzzy' })} />)

    const dot = document.querySelector('[title="fuzzy"]')
    expect(dot).toBeTruthy()
  })

  it('shows semantic match type label', () => {
    render(<ResultItem {...defaultProps} result={makeResult({ matchType: 'semantic' })} />)

    const dot = document.querySelector('[title="semantic"]')
    expect(dot).toBeTruthy()
  })

  it('applies selected background when isSelected is true', () => {
    const { container } = render(<ResultItem {...defaultProps} isSelected={true} />)

    const item = container.querySelector('.result-item') as HTMLElement
    expect(item.style.background).toContain('rgba(255, 255, 255, 0.055)')
  })

  it('applies transparent background when not selected', () => {
    const { container } = render(<ResultItem {...defaultProps} isSelected={false} />)

    const item = container.querySelector('.result-item') as HTMLElement
    expect(item.style.background).toBe('transparent')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<ResultItem {...defaultProps} onClick={onClick} />)

    const item = document.querySelector('.result-item')!
    fireEvent.click(item)

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('calls onSelect on mouse enter', () => {
    const onSelect = vi.fn()
    render(<ResultItem {...defaultProps} onSelect={onSelect} />)

    const item = document.querySelector('.result-item')!
    fireEvent.mouseEnter(item)

    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('renders path breadcrumb', () => {
    render(<ResultItem {...defaultProps} result={makeResult({ path: 'vault/projects/notes/doc.md' })} />)

    expect(screen.getByText('vault / projects / notes')).toBeInTheDocument()
  })

  it('limits displayed tags to 3', () => {
    const result = makeResult({
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    })
    render(<ResultItem {...defaultProps} result={result} />)

    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
    expect(screen.getByText('tag3')).toBeInTheDocument()
    expect(screen.queryByText('tag4')).not.toBeInTheDocument()
    expect(screen.queryByText('tag5')).not.toBeInTheDocument()
  })

  it('does not highlight when query is empty', () => {
    render(<ResultItem {...defaultProps} query="" />)

    const allSpans = document.querySelectorAll('span')
    const highlighted = Array.from(allSpans).find(
      span => span.style.fontWeight === '500' && span.style.color === '#a88cff',
    )
    expect(highlighted).toBeUndefined()
  })
})
