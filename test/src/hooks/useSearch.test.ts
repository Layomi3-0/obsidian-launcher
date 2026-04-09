import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSearch } from '@/hooks/useSearch'

const mockSearch = vi.fn().mockResolvedValue([])
const mockSendAIQuery = vi.fn()
const mockCancelAIQuery = vi.fn()
const mockOnStreamChunk = vi.fn().mockReturnValue(() => {})
const mockOnWindowHidden = vi.fn().mockReturnValue(() => {})
const mockGetConversations = vi.fn().mockResolvedValue([])
const mockLoadConversation = vi.fn().mockResolvedValue([])
const mockNewConversation = vi.fn().mockResolvedValue('new-session')

vi.mock('@/lib/ipc', () => ({
  search: (...args: unknown[]) => mockSearch(...args),
  sendAIQuery: (...args: unknown[]) => mockSendAIQuery(...args),
  cancelAIQuery: (...args: unknown[]) => mockCancelAIQuery(...args),
  onStreamChunk: (...args: unknown[]) => mockOnStreamChunk(...args),
  onWindowHidden: (...args: unknown[]) => mockOnWindowHidden(...args),
  getConversations: (...args: unknown[]) => mockGetConversations(...args),
  loadConversation: (...args: unknown[]) => mockLoadConversation(...args),
  newConversation: (...args: unknown[]) => mockNewConversation(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSearch.mockResolvedValue([])
  mockGetConversations.mockResolvedValue([])
  mockLoadConversation.mockResolvedValue([])
  mockNewConversation.mockResolvedValue('new-session')
})

describe('useSearch', () => {
  describe('initial state', () => {
    it('returns idle mode with empty results', () => {
      const { result } = renderHook(() => useSearch())

      expect(result.current.query).toBe('')
      expect(result.current.results).toEqual([])
      expect(result.current.mode).toBe('idle')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.chatMessages).toEqual([])
      expect(result.current.isStreaming).toBe(false)
      expect(result.current.conversations).toEqual([])
    })
  })

  describe('setQuery', () => {
    it('triggers local search for regular text', async () => {
      const searchResults = [
        { path: 'notes/test.md', title: 'Test', snippet: 'hello', score: 1, matchType: 'fuzzy' as const, tags: [], lastModified: '2024-01-01' },
      ]
      mockSearch.mockResolvedValue(searchResults)

      const { result } = renderHook(() => useSearch())

      await act(async () => {
        result.current.setQuery('hello')
      })

      expect(mockSearch).toHaveBeenCalledWith('hello')
      expect(result.current.mode).toBe('local')
    })

    it('switches to AI mode with > prefix', () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('> tell me about notes')
      })

      expect(result.current.mode).toBe('ai')
      expect(mockSearch).not.toHaveBeenCalled()
    })

    it('switches to AI mode with / prefix', () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('/briefing')
      })

      expect(result.current.mode).toBe('ai')
      expect(mockSearch).not.toHaveBeenCalled()
    })

    it('returns to idle on empty query when no chat active', () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('> something')
      })
      expect(result.current.mode).toBe('ai')

      act(() => {
        result.current.setQuery('')
      })
      expect(result.current.mode).toBe('idle')
    })

    it('stays in AI mode on empty query when chat is active', async () => {
      const { result } = renderHook(() => useSearch())

      // Enter AI mode and send a message to create chat history
      act(() => {
        result.current.setQuery('> hello')
      })
      await act(async () => {
        result.current.sendMessage()
      })

      // Now clear query - should stay in AI mode because chat has messages
      act(() => {
        result.current.setQuery('')
      })
      expect(result.current.mode).toBe('ai')
    })
  })

  describe('sendMessage', () => {
    it('adds user and assistant messages and calls sendAIQuery', async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('> summarize my notes')
      })

      await act(async () => {
        result.current.sendMessage()
      })

      expect(result.current.chatMessages).toHaveLength(2)
      expect(result.current.chatMessages[0]).toEqual({ role: 'user', content: 'summarize my notes', attachments: undefined })
      expect(result.current.chatMessages[1]).toEqual({ role: 'assistant', content: '' })
      expect(mockSendAIQuery).toHaveBeenCalledWith(expect.any(String), '>summarize my notes', undefined)
      expect(result.current.isStreaming).toBe(true)
      expect(result.current.query).toBe('')
    })

    it('is a no-op when text is empty', async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery('> ')
      })

      await act(async () => {
        result.current.sendMessage()
      })

      expect(result.current.chatMessages).toHaveLength(0)
      expect(mockSendAIQuery).not.toHaveBeenCalled()
    })

    it('queues follow-up messages while streaming instead of blocking', async () => {
      const { result } = renderHook(() => useSearch())

      // Send first message
      act(() => {
        result.current.setQuery('> first message')
      })
      await act(async () => {
        result.current.sendMessage()
      })
      expect(result.current.isStreaming).toBe(true)

      // Send second message while first is still streaming
      act(() => {
        result.current.setQuery('> second message')
      })
      await act(async () => {
        result.current.sendMessage()
      })

      // First message's bubbles remain; second is queued, not yet dispatched
      expect(result.current.chatMessages).toHaveLength(2)
      expect(mockSendAIQuery).toHaveBeenCalledTimes(1)
      expect(result.current.queuedMessages).toHaveLength(1)
      expect(result.current.queuedMessages[0].content).toBe('second message')
    })
  })

  describe('queue drain and cancel', () => {
    it('drains the queue when streaming finishes', async () => {
      let chunkCb: (data: { requestId: string; chunk: string; done: boolean; interrupted?: boolean }) => void = () => {}
      mockOnStreamChunk.mockImplementation((cb: typeof chunkCb) => {
        chunkCb = cb
        return () => {}
      })

      const { result } = renderHook(() => useSearch())

      act(() => { result.current.setQuery('> first') })
      await act(async () => { result.current.sendMessage() })
      const firstReqId = mockSendAIQuery.mock.calls[0][0] as string

      act(() => { result.current.setQuery('> follow-up A') })
      await act(async () => { result.current.sendMessage() })
      act(() => { result.current.setQuery('> follow-up B') })
      await act(async () => { result.current.sendMessage() })
      expect(result.current.queuedMessages).toHaveLength(2)

      // Simulate stream finishing
      act(() => {
        chunkCb({ requestId: firstReqId, chunk: 'hello', done: false })
      })
      act(() => {
        chunkCb({ requestId: firstReqId, chunk: '', done: true })
      })

      // Queue drained, new request dispatched with joined text
      expect(result.current.queuedMessages).toHaveLength(0)
      expect(mockSendAIQuery).toHaveBeenCalledTimes(2)
      const secondCall = mockSendAIQuery.mock.calls[1]
      expect(secondCall[1]).toBe('>follow-up A\n\nfollow-up B')
      expect(result.current.isStreaming).toBe(true)
    })

    it('cancelInflight sends ai:cancel and finalizes on interrupted chunk', async () => {
      let chunkCb: (data: { requestId: string; chunk: string; done: boolean; interrupted?: boolean }) => void = () => {}
      mockOnStreamChunk.mockImplementation((cb: typeof chunkCb) => {
        chunkCb = cb
        return () => {}
      })

      const { result } = renderHook(() => useSearch())

      act(() => { result.current.setQuery('> long task') })
      await act(async () => { result.current.sendMessage() })
      const reqId = mockSendAIQuery.mock.calls[0][0] as string

      // Partial chunk then cancel
      act(() => { chunkCb({ requestId: reqId, chunk: 'partial', done: false }) })
      act(() => { result.current.cancelInflight() })

      expect(mockCancelAIQuery).toHaveBeenCalledWith(reqId)

      // Main process sends done+interrupted
      act(() => { chunkCb({ requestId: reqId, chunk: '', done: true, interrupted: true }) })

      expect(result.current.isStreaming).toBe(false)
      const lastMsg = result.current.chatMessages[result.current.chatMessages.length - 1]
      expect(lastMsg.role).toBe('assistant')
      expect(lastMsg.content).toBe('partial')
      expect(lastMsg.interrupted).toBe(true)
    })

    it('ignores chunks from a stale requestId', async () => {
      let chunkCb: (data: { requestId: string; chunk: string; done: boolean; interrupted?: boolean }) => void = () => {}
      mockOnStreamChunk.mockImplementation((cb: typeof chunkCb) => {
        chunkCb = cb
        return () => {}
      })

      const { result } = renderHook(() => useSearch())

      act(() => { result.current.setQuery('> hi') })
      await act(async () => { result.current.sendMessage() })

      // Late chunk from a different request — should be dropped
      act(() => {
        chunkCb({ requestId: 'stale-id', chunk: 'ghost', done: false })
      })

      const last = result.current.chatMessages[result.current.chatMessages.length - 1]
      expect(last.content).toBe('')
    })
  })

  describe('clearSearch', () => {
    it('resets all state and starts new conversation', async () => {
      const { result } = renderHook(() => useSearch())

      // Build up some state
      act(() => {
        result.current.setQuery('> question')
      })
      await act(async () => {
        result.current.sendMessage()
      })

      // Clear
      act(() => {
        result.current.clearSearch()
      })

      expect(result.current.query).toBe('')
      expect(result.current.results).toEqual([])
      expect(result.current.mode).toBe('idle')
      expect(result.current.chatMessages).toEqual([])
      expect(result.current.isStreaming).toBe(false)
      expect(result.current.conversations).toEqual([])
      expect(mockNewConversation).toHaveBeenCalled()
    })
  })

  describe('showHistory', () => {
    it('sets mode to history and fetches conversations', async () => {
      const convos = [
        { id: '1', title: 'Chat 1', created_at: '2024-01-01', updated_at: '2024-01-01', message_count: 3 },
      ]
      mockGetConversations.mockResolvedValue(convos)

      const { result } = renderHook(() => useSearch())

      await act(async () => {
        result.current.showHistory()
      })

      expect(result.current.mode).toBe('history')
      expect(result.current.query).toBe('')
      expect(mockGetConversations).toHaveBeenCalled()
      expect(result.current.conversations).toEqual(convos)
    })
  })

  describe('window hide/show', () => {
    it('preserves chat messages and mode when window is hidden', async () => {
      let hiddenCallback: () => void = () => {}
      mockOnWindowHidden.mockImplementation((cb: () => void) => {
        hiddenCallback = cb
        return () => {}
      })

      const { result } = renderHook(() => useSearch())

      // Start a chat
      act(() => {
        result.current.setQuery('> hello')
      })
      await act(async () => {
        result.current.sendMessage()
      })
      expect(result.current.chatMessages).toHaveLength(2)
      expect(result.current.mode).toBe('ai')

      // Simulate window hide
      act(() => {
        hiddenCallback()
      })

      // Chat state preserved, transient UI cleared
      expect(result.current.chatMessages).toHaveLength(2)
      expect(result.current.mode).toBe('ai')
      expect(result.current.isStreaming).toBe(true)
      expect(result.current.query).toBe('')
      expect(result.current.results).toEqual([])
      expect(result.current.conversations).toEqual([])
    })

    it('clears search results on hide but keeps idle mode', () => {
      let hiddenCallback: () => void = () => {}
      mockOnWindowHidden.mockImplementation((cb: () => void) => {
        hiddenCallback = cb
        return () => {}
      })

      const { result } = renderHook(() => useSearch())

      // Simulate window hide with no active chat
      act(() => {
        hiddenCallback()
      })

      expect(result.current.mode).toBe('idle')
      expect(result.current.chatMessages).toEqual([])
    })
  })

  describe('startNewConversation', () => {
    it('resets state after creating new conversation', async () => {
      const { result } = renderHook(() => useSearch())

      // Build state
      act(() => {
        result.current.setQuery('> something')
      })
      await act(async () => {
        result.current.sendMessage()
      })

      // Start new
      await act(async () => {
        result.current.startNewConversation()
      })

      expect(result.current.query).toBe('')
      expect(result.current.mode).toBe('idle')
      expect(result.current.chatMessages).toEqual([])
      expect(result.current.conversations).toEqual([])
      expect(mockNewConversation).toHaveBeenCalled()
    })
  })
})
