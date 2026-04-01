import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmptyState } from '@/components/EmptyState/index'
import type { SessionContext, KanbanCard, KanbanProject, Conversation } from '@/lib/types'

const mockGetKanbanSummary = vi.fn()
const mockGetConversations = vi.fn()

vi.mock('@/lib/ipc', () => ({
  getKanbanSummary: (...args: unknown[]) => mockGetKanbanSummary(...args),
  getConversations: (...args: unknown[]) => mockGetConversations(...args),
  openUrl: vi.fn(),
  hideWindow: vi.fn(),
}))

function makeCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: 'card-1',
    fullId: 'full-card-1',
    title: 'Test Card',
    status: 'In Progress',
    priority: 'P0 Today',
    owner: 'me',
    project: 'Test Project',
    projectSlug: 'test-project',
    ...overrides,
  }
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    title: 'Previous Chat',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
    message_count: 5,
    ...overrides,
  }
}

const defaultContext: SessionContext = {
  sessionId: 'test-session',
  recentQueries: [],
  lastNoteOpened: null,
  clipboardPreview: null,
  timeOfDay: 'morning',
  isFirstInvocationToday: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetKanbanSummary.mockResolvedValue({ cards: [], projects: [] })
  mockGetConversations.mockResolvedValue([])
})

describe('EmptyState', () => {
  it('renders without crashing when context is null', () => {
    const { container } = render(<EmptyState context={null} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows time header with correct time of day', () => {
    render(<EmptyState context={{ ...defaultContext, timeOfDay: 'morning' }} />)
    expect(screen.getByText('MORNING')).toBeInTheDocument()
  })

  it('shows afternoon label for afternoon context', () => {
    render(<EmptyState context={{ ...defaultContext, timeOfDay: 'afternoon' }} />)
    expect(screen.getByText('AFTERNOON')).toBeInTheDocument()
  })

  it('shows evening label for evening context', () => {
    render(<EmptyState context={{ ...defaultContext, timeOfDay: 'evening' }} />)
    expect(screen.getByText('EVENING')).toBeInTheDocument()
  })

  it('shows board overview when cards are provided', async () => {
    const cards = [makeCard({ status: 'In Progress' }), makeCard({ id: 'card-2', status: 'Next' })]
    mockGetKanbanSummary.mockResolvedValue({ cards, projects: [] })

    render(<EmptyState context={defaultContext} />)

    expect(await screen.findByText('Board')).toBeInTheDocument()
    expect(await screen.findByText('2 active')).toBeInTheDocument()
  })

  it('shows actionable items when available', async () => {
    const cards = [makeCard({ status: 'In Progress', priority: 'P0 Today', title: 'Urgent Task' })]
    mockGetKanbanSummary.mockResolvedValue({ cards, projects: [] })

    render(<EmptyState context={defaultContext} />)

    expect(await screen.findByText('Up Next')).toBeInTheDocument()
    expect(await screen.findByText('Urgent Task')).toBeInTheDocument()
  })

  it('shows thread rows when conversations exist', async () => {
    const convos = [makeConversation({ title: 'My Conversation' })]
    mockGetConversations.mockResolvedValue(convos)

    render(<EmptyState context={defaultContext} />)

    expect(await screen.findByText('Threads')).toBeInTheDocument()
    expect(await screen.findByText('My Conversation')).toBeInTheDocument()
  })

  it('shows empty message when no data', () => {
    render(<EmptyState context={defaultContext} />)

    expect(screen.getByText('Search your vault, ask a question, or try a command')).toBeInTheDocument()
  })

  it('renders quick action strip with buttons', () => {
    render(<EmptyState context={defaultContext} />)

    expect(screen.getByText('/briefing')).toBeInTheDocument()
    expect(screen.getByText('/capture')).toBeInTheDocument()
    expect(screen.getByText('> ask anything')).toBeInTheDocument()
  })

  it('calls onQueryChange when quick action is clicked', () => {
    const onQueryChange = vi.fn()
    render(<EmptyState context={defaultContext} onQueryChange={onQueryChange} />)

    fireEvent.click(screen.getByText('/briefing'))

    expect(onQueryChange).toHaveBeenCalledWith('/briefing ')
  })

  it('calls onSelectConversation when thread row is clicked', async () => {
    const onSelectConversation = vi.fn()
    const conv = makeConversation({ title: 'Click Me' })
    mockGetConversations.mockResolvedValue([conv])

    render(<EmptyState context={defaultContext} onSelectConversation={onSelectConversation} />)

    const threadRow = await screen.findByText('Click Me')
    fireEvent.click(threadRow)

    expect(onSelectConversation).toHaveBeenCalledWith(conv)
  })

  it('calls onShowHistory when all link is clicked', async () => {
    const onShowHistory = vi.fn()
    mockGetConversations.mockResolvedValue([makeConversation()])

    render(<EmptyState context={defaultContext} onShowHistory={onShowHistory} />)

    const allLink = await screen.findByText('all →')
    fireEvent.click(allLink)

    expect(onShowHistory).toHaveBeenCalled()
  })
})
