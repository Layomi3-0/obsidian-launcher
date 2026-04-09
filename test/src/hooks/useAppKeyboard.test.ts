import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppKeyboard } from '@/hooks/useAppKeyboard'
import type { Conversation } from '@/lib/types'

const mockOpenNote = vi.fn().mockResolvedValue(undefined)
const mockHideWindow = vi.fn()

vi.mock('@/lib/ipc', () => ({
  openNote: (...args: unknown[]) => mockOpenNote(...args),
  hideWindow: (...args: unknown[]) => mockHideWindow(...args),
}))

vi.mock('@/components/CommandPalette', async () => {
  const actual = await vi.importActual<typeof import('@/components/CommandPalette')>('@/components/CommandPalette')
  return actual
})

function makeKeyEvent(key: string, extra: Partial<React.KeyboardEvent> = {}): React.KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    ...extra,
  } as unknown as React.KeyboardEvent
}

function defaultParams(overrides: Partial<Parameters<typeof useAppKeyboard>[0]> = {}) {
  return {
    query: '',
    mode: 'idle',
    chatMessages: [] as { role: string }[],
    isStreaming: false,
    conversations: [] as Conversation[],
    queuedMessages: [] as { id: string }[],
    results: [],
    setQuery: vi.fn(),
    sendMessage: vi.fn(),
    cancelInflight: vi.fn(),
    removeQueuedMessage: vi.fn(),
    clearSearch: vi.fn(),
    showHistory: vi.fn(),
    selectConversation: vi.fn(),
    startNewConversation: vi.fn(),
    handleKeyDown: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => '' } as Selection)
})

describe('useAppKeyboard', () => {
  describe('slash command navigation', () => {
    it('enters slash mode when query starts with / and no chat is active', () => {
      const params = defaultParams({ query: '/', mode: 'ai' })
      const { result } = renderHook(() => useAppKeyboard(params))

      expect(result.current.isSlashMode).toBe(true)
      expect(result.current.filteredCommands.length).toBeGreaterThan(0)
    })

    it('does not enter slash mode when chat messages exist', () => {
      const params = defaultParams({
        query: '/',
        mode: 'ai',
        chatMessages: [{ role: 'user' }],
      })
      const { result } = renderHook(() => useAppKeyboard(params))

      expect(result.current.isSlashMode).toBe(false)
    })

    it('ArrowDown increments command index', () => {
      const params = defaultParams({ query: '/' })
      const { result } = renderHook(() => useAppKeyboard(params))
      const e = makeKeyEvent('ArrowDown')

      act(() => { result.current.onKeyDown(e) })

      expect(e.preventDefault).toHaveBeenCalled()
      expect(result.current.cmdIndex).toBe(1)
    })

    it('ArrowDown clamps at last command', () => {
      const params = defaultParams({ query: '/' })
      const { result } = renderHook(() => useAppKeyboard(params))

      const commandCount = result.current.filteredCommands.length
      for (let i = 0; i < commandCount + 5; i++) {
        act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })
      }

      expect(result.current.cmdIndex).toBe(commandCount - 1)
    })

    it('ArrowUp decrements command index', () => {
      const params = defaultParams({ query: '/' })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })
      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })
      expect(result.current.cmdIndex).toBe(2)

      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowUp')) })
      expect(result.current.cmdIndex).toBe(1)
    })

    it('ArrowUp clamps at zero', () => {
      const params = defaultParams({ query: '/' })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowUp')) })

      expect(result.current.cmdIndex).toBe(0)
    })

    it('Tab selects the current command and populates query', () => {
      const params = defaultParams({ query: '/' })
      const { result } = renderHook(() => useAppKeyboard(params))

      const firstCommand = result.current.filteredCommands[0]
      act(() => { result.current.onKeyDown(makeKeyEvent('Tab')) })

      expect(params.setQuery).toHaveBeenCalledWith(firstCommand.name + ' ')
    })

    it('Tab on /history calls showHistory', () => {
      const params = defaultParams({ query: '/history' })
      const { result } = renderHook(() => useAppKeyboard(params))

      // /history should be the only filtered result
      expect(result.current.filteredCommands[0].name).toBe('/history')

      act(() => { result.current.onKeyDown(makeKeyEvent('Tab')) })

      expect(params.showHistory).toHaveBeenCalled()
      expect(params.setQuery).not.toHaveBeenCalled()
    })

    it('Tab on /new calls startNewConversation', () => {
      const params = defaultParams({ query: '/new' })
      const { result } = renderHook(() => useAppKeyboard(params))

      expect(result.current.filteredCommands[0].name).toBe('/new')

      act(() => { result.current.onKeyDown(makeKeyEvent('Tab')) })

      expect(params.startNewConversation).toHaveBeenCalled()
      expect(params.setQuery).not.toHaveBeenCalled()
    })

    it('Enter selects command when query exactly matches command name', () => {
      const params = defaultParams({ query: '/briefing' })
      const { result } = renderHook(() => useAppKeyboard(params))

      expect(result.current.filteredCommands[0].name).toBe('/briefing')

      act(() => { result.current.onKeyDown(makeKeyEvent('Enter')) })

      expect(params.setQuery).toHaveBeenCalledWith('/briefing ')
    })

    it('Enter does not select command when query partially matches', () => {
      const params = defaultParams({ query: '/bri' })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('Enter')) })

      // Should fall through to the default handleKeyDown
      expect(params.setQuery).not.toHaveBeenCalled()
      expect(params.handleKeyDown).toHaveBeenCalled()
    })
  })

  describe('preview toggle', () => {
    it('Tab toggles preview in local mode', () => {
      const params = defaultParams({ query: 'test', mode: 'local' })
      const { result } = renderHook(() => useAppKeyboard(params))
      const e = makeKeyEvent('Tab')

      expect(result.current.previewVisible).toBe(false)

      act(() => { result.current.onKeyDown(e) })

      expect(e.preventDefault).toHaveBeenCalled()
      expect(result.current.previewVisible).toBe(true)
    })

    it('Tab toggles preview off again in local mode', () => {
      const params = defaultParams({ query: 'test', mode: 'local' })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('Tab')) })
      expect(result.current.previewVisible).toBe(true)

      act(() => { result.current.onKeyDown(makeKeyEvent('Tab')) })
      expect(result.current.previewVisible).toBe(false)
    })

    it('Tab does not toggle preview in AI mode', () => {
      const params = defaultParams({ query: '> hello', mode: 'ai' })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('Tab')) })

      expect(result.current.previewVisible).toBe(false)
      expect(params.handleKeyDown).toHaveBeenCalled()
    })
  })

  describe('AI send', () => {
    it('Enter sends message in AI mode', () => {
      const params = defaultParams({ query: '> hello', mode: 'ai' })
      const { result } = renderHook(() => useAppKeyboard(params))
      const e = makeKeyEvent('Enter')

      act(() => { result.current.onKeyDown(e) })

      expect(e.preventDefault).toHaveBeenCalled()
      expect(params.sendMessage).toHaveBeenCalled()
    })

    it('Enter does not send in local mode', () => {
      const params = defaultParams({ query: 'hello', mode: 'local' })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('Enter')) })

      expect(params.sendMessage).not.toHaveBeenCalled()
      expect(params.handleKeyDown).toHaveBeenCalled()
    })
  })

  describe('Ctrl+C cancel', () => {
    it('cancels inflight streaming on Ctrl+C with no selection', () => {
      const params = defaultParams({ query: '> task', mode: 'ai', isStreaming: true })
      const { result } = renderHook(() => useAppKeyboard(params))
      const e = makeKeyEvent('c', { ctrlKey: true })

      act(() => { result.current.onKeyDown(e) })

      expect(e.preventDefault).toHaveBeenCalled()
      expect(params.cancelInflight).toHaveBeenCalled()
    })

    it('does not cancel when text is selected (allows copy)', () => {
      vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'selected text' } as Selection)

      const params = defaultParams({ query: '> task', mode: 'ai', isStreaming: true })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('c', { ctrlKey: true })) })

      expect(params.cancelInflight).not.toHaveBeenCalled()
    })

    it('does not cancel when not streaming', () => {
      const params = defaultParams({ query: '> task', mode: 'ai', isStreaming: false })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('c', { ctrlKey: true })) })

      expect(params.cancelInflight).not.toHaveBeenCalled()
    })
  })

  describe('history navigation', () => {
    const conversations: Conversation[] = [
      { id: '1', title: 'Chat 1', created_at: '2024-01-01', updated_at: '2024-01-01', message_count: 3 },
      { id: '2', title: 'Chat 2', created_at: '2024-01-02', updated_at: '2024-01-02', message_count: 5 },
      { id: '3', title: 'Chat 3', created_at: '2024-01-03', updated_at: '2024-01-03', message_count: 1 },
    ]

    it('ArrowDown increments conversation index', () => {
      const params = defaultParams({ mode: 'history', conversations })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })

      expect(result.current.convIndex).toBe(1)
    })

    it('ArrowDown clamps at last conversation', () => {
      const params = defaultParams({ mode: 'history', conversations })
      const { result } = renderHook(() => useAppKeyboard(params))

      for (let i = 0; i < 10; i++) {
        act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })
      }

      expect(result.current.convIndex).toBe(2)
    })

    it('ArrowUp decrements conversation index', () => {
      const params = defaultParams({ mode: 'history', conversations })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })
      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })
      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowUp')) })

      expect(result.current.convIndex).toBe(1)
    })

    it('ArrowUp clamps at zero', () => {
      const params = defaultParams({ mode: 'history', conversations })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowUp')) })

      expect(result.current.convIndex).toBe(0)
    })

    it('Enter selects the current conversation', () => {
      const params = defaultParams({ mode: 'history', conversations })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })
      act(() => { result.current.onKeyDown(makeKeyEvent('Enter')) })

      expect(params.selectConversation).toHaveBeenCalledWith(conversations[1])
    })

    it('does nothing in non-history mode', () => {
      const params = defaultParams({ mode: 'ai', conversations })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })

      expect(result.current.convIndex).toBe(0)
      expect(params.handleKeyDown).toHaveBeenCalled()
    })

    it('does nothing when conversations list is empty', () => {
      const params = defaultParams({ mode: 'history', conversations: [] })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })

      expect(result.current.convIndex).toBe(0)
    })
  })

  describe('escape priority chain', () => {
    it('cancels stream first when streaming', () => {
      const params = defaultParams({ mode: 'ai', isStreaming: true })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('Escape')) })

      expect(params.cancelInflight).toHaveBeenCalled()
      expect(params.removeQueuedMessage).not.toHaveBeenCalled()
      expect(params.clearSearch).not.toHaveBeenCalled()
    })

    it('clears queue second when messages are queued', () => {
      const params = defaultParams({
        mode: 'ai',
        isStreaming: false,
        queuedMessages: [{ id: 'q1' }, { id: 'q2' }],
      })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('Escape')) })

      expect(params.cancelInflight).not.toHaveBeenCalled()
      expect(params.removeQueuedMessage).toHaveBeenCalledTimes(2)
      expect(params.removeQueuedMessage).toHaveBeenCalledWith('q1')
      expect(params.removeQueuedMessage).toHaveBeenCalledWith('q2')
      expect(params.clearSearch).not.toHaveBeenCalled()
    })

    it('clears search and hides window when no chat, no stream, no queue', () => {
      const params = defaultParams({ mode: 'idle', chatMessages: [] })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('Escape')) })

      expect(params.clearSearch).toHaveBeenCalled()
      expect(mockHideWindow).toHaveBeenCalled()
    })

    it('clears search without hiding when chat messages exist', () => {
      const params = defaultParams({
        mode: 'ai',
        chatMessages: [{ role: 'user' }, { role: 'assistant' }],
      })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('Escape')) })

      expect(params.clearSearch).toHaveBeenCalled()
      expect(mockHideWindow).not.toHaveBeenCalled()
    })

    it('clears search without hiding in history mode', () => {
      const params = defaultParams({ mode: 'history', chatMessages: [] })
      const { result } = renderHook(() => useAppKeyboard(params))

      act(() => { result.current.onKeyDown(makeKeyEvent('Escape')) })

      expect(params.clearSearch).toHaveBeenCalled()
      expect(mockHideWindow).not.toHaveBeenCalled()
    })
  })

  describe('handleQueryChange', () => {
    it('sets query and resets command index', () => {
      const params = defaultParams({ query: '/' })
      const { result } = renderHook(() => useAppKeyboard(params))

      // Advance command index
      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })
      act(() => { result.current.onKeyDown(makeKeyEvent('ArrowDown')) })
      expect(result.current.cmdIndex).toBe(2)

      // handleQueryChange should reset it
      act(() => { result.current.handleQueryChange('/new-query') })

      expect(params.setQuery).toHaveBeenCalledWith('/new-query')
      expect(result.current.cmdIndex).toBe(0)
    })
  })

  describe('executeResult', () => {
    it('opens note, clears search, and hides window', () => {
      const params = defaultParams()
      const { result } = renderHook(() => useAppKeyboard(params))

      const searchResult = {
        path: 'notes/test.md',
        title: 'Test',
        snippet: 'hello',
        score: 1,
        matchType: 'fuzzy' as const,
        tags: [],
        lastModified: '2024-01-01',
      }

      act(() => { result.current.executeResult(searchResult) })

      expect(mockOpenNote).toHaveBeenCalledWith('notes/test.md')
      expect(params.clearSearch).toHaveBeenCalled()
      expect(mockHideWindow).toHaveBeenCalled()
    })
  })

  describe('selectCommand', () => {
    it('resets convIndex when /history is selected', () => {
      const params = defaultParams({ query: '/history' })
      const { result } = renderHook(() => useAppKeyboard(params))

      const historyCmd = result.current.filteredCommands.find(c => c.name === '/history')!
      act(() => { result.current.selectCommand(historyCmd) })

      expect(params.showHistory).toHaveBeenCalled()
    })

    it('sets query with trailing space for regular commands', () => {
      const params = defaultParams({ query: '/briefing' })
      const { result } = renderHook(() => useAppKeyboard(params))

      const cmd = result.current.filteredCommands.find(c => c.name === '/briefing')!
      act(() => { result.current.selectCommand(cmd) })

      expect(params.setQuery).toHaveBeenCalledWith('/briefing ')
    })
  })

  describe('fallthrough to handleKeyDown', () => {
    it('delegates unhandled keys to params.handleKeyDown', () => {
      const params = defaultParams({ query: 'test', mode: 'idle' })
      const { result } = renderHook(() => useAppKeyboard(params))
      const e = makeKeyEvent('a')

      act(() => { result.current.onKeyDown(e) })

      expect(params.handleKeyDown).toHaveBeenCalledWith(e)
    })
  })
})
