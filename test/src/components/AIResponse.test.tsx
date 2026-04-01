import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIResponse, renderMarkdown } from '@/components/AIResponse/index'
import type { ChatMessage } from '@/hooks/useSearch'

vi.mock('@/lib/ipc', () => ({
  hideWindow: vi.fn(),
}))

vi.mock('marked', () => ({
  marked: {
    parse: (text: string) => `<p>${text}</p>`,
  },
}))

vi.mock('@/components/AIResponse/CaptureButton', () => ({
  CaptureButton: ({ messages }: { messages: ChatMessage[] }) => (
    <button data-testid="capture-button">Capture ({messages.length} messages)</button>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  window.launcher = {
    openNote: vi.fn().mockResolvedValue(undefined),
  } as any
})

describe('AIResponse', () => {
  it('renders empty state with placeholder when no messages', () => {
    render(<AIResponse messages={[]} isStreaming={false} />)

    expect(screen.getByText('Type your message and press Enter...')).toBeInTheDocument()
  })

  it('renders user messages as bubbles', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello there' },
    ]

    render(<AIResponse messages={messages} isStreaming={false} />)

    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('renders assistant messages with markdown', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Here is the answer' },
    ]

    render(<AIResponse messages={messages} isStreaming={false} />)

    expect(screen.getByText('Question')).toBeInTheDocument()
    // The mock marked.parse wraps in <p> tags, rendered via dangerouslySetInnerHTML
    const markdownDiv = document.querySelector('.markdown-body')
    expect(markdownDiv).toBeTruthy()
    expect(markdownDiv?.innerHTML).toContain('Here is the answer')
  })

  it('shows thinking dots when streaming with no content', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: '' },
    ]

    render(<AIResponse messages={messages} isStreaming={true} />)

    // ThinkingDots renders 3 pulse-dot divs
    const dots = document.querySelectorAll('.animate-pulse-dot')
    expect(dots).toHaveLength(3)
  })

  it('does not show thinking dots when assistant has content while streaming', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Partial response...' },
    ]

    render(<AIResponse messages={messages} isStreaming={true} />)

    const dots = document.querySelectorAll('.animate-pulse-dot')
    expect(dots).toHaveLength(0)
  })

  it('renders multiple message pairs', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Follow up' },
      { role: 'assistant', content: 'Second answer' },
    ]

    render(<AIResponse messages={messages} isStreaming={false} />)

    expect(screen.getByText('First question')).toBeInTheDocument()
    expect(screen.getByText('Follow up')).toBeInTheDocument()
    const markdownBodies = document.querySelectorAll('.markdown-body')
    expect(markdownBodies).toHaveLength(2)
  })

  it('shows capture button after streaming completes', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'What is this?' },
      { role: 'assistant', content: 'This is the answer.' },
    ]

    render(<AIResponse messages={messages} isStreaming={false} />)

    expect(screen.getByTestId('capture-button')).toBeInTheDocument()
    expect(screen.getByText('Capture (2 messages)')).toBeInTheDocument()
  })

  it('does not show capture button while streaming', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Responding...' },
    ]

    render(<AIResponse messages={messages} isStreaming={true} />)

    expect(screen.queryByTestId('capture-button')).not.toBeInTheDocument()
  })

  it('does not show capture button when last message is user', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
    ]

    render(<AIResponse messages={messages} isStreaming={false} />)

    expect(screen.queryByTestId('capture-button')).not.toBeInTheDocument()
  })
})

describe('renderMarkdown', () => {
  it('converts wikilinks to anchors with data-note attribute', () => {
    const html = renderMarkdown('Check [[My Note]] for details')

    expect(html).toContain('data-note="My Note"')
    expect(html).toContain('class="wikilink"')
    expect(html).toContain('>My Note</a>')
  })

  it('handles wikilinks with alias syntax', () => {
    const html = renderMarkdown('See [[My Note|display text]] here')

    expect(html).toContain('data-note="My Note"')
    expect(html).toContain('>display text</a>')
  })

  it('handles multiple wikilinks in one string', () => {
    const html = renderMarkdown('Link [[Note A]] and [[Note B]]')

    expect(html).toContain('data-note="Note A"')
    expect(html).toContain('data-note="Note B"')
  })

  it('escapes special characters in note names', () => {
    const html = renderMarkdown('See [[Note "with" quotes]]')

    expect(html).toContain('data-note="Note &quot;with&quot; quotes"')
  })
})
