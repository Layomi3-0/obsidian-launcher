import { useState, useCallback, useRef, useEffect } from 'react'
import type { SearchResult, Conversation } from '@/lib/types'
import {
  search as ipcSearch,
  sendAIQuery,
  onStreamChunk,
  onWindowHidden,
  getConversations,
  loadConversation as ipcLoadConversation,
  newConversation as ipcNewConversation,
} from '@/lib/ipc'

type SearchMode = 'local' | 'ai' | 'idle' | 'history'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface UseSearchReturn {
  query: string
  results: SearchResult[]
  mode: SearchMode
  isLoading: boolean
  chatMessages: ChatMessage[]
  isStreaming: boolean
  conversations: Conversation[]
  setQuery: (query: string) => void
  sendMessage: () => void
  clearSearch: () => void
  showHistory: () => void
  selectConversation: (conv: Conversation) => void
  startNewConversation: () => void
}

export function useSearch(): UseSearchReturn {
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [mode, setMode] = useState<SearchMode>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const streamBufferRef = useRef('')

  // On hide: clear transient UI (query, results, history) but preserve active chat
  useEffect(() => {
    return onWindowHidden(() => {
      setQueryState('')
      setResults([])
      setConversations([])
    })
  }, [])

  // Listen for AI streaming chunks
  useEffect(() => {
    return onStreamChunk((chunk, done) => {
      if (done) {
        const finalContent = streamBufferRef.current
        streamBufferRef.current = ''
        setChatMessages(prev =>
          prev.map((msg, i) =>
            i === prev.length - 1 && msg.role === 'assistant'
              ? { ...msg, content: finalContent }
              : msg,
          ),
        )
        setIsStreaming(false)
      } else {
        streamBufferRef.current += chunk
        const accumulated = streamBufferRef.current
        setChatMessages(prev =>
          prev.map((msg, i) =>
            i === prev.length - 1 && msg.role === 'assistant'
              ? { ...msg, content: accumulated }
              : msg,
          ),
        )
      }
    })
  }, [])

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery)

    // Detect AI mode from prefix but DON'T send yet — wait for Enter
    if (newQuery.startsWith('>') || newQuery.startsWith('/')) {
      if (mode !== 'ai' && mode !== 'history') {
        setMode('ai')
        setResults([])
      }
      return
    }

    if (!newQuery.trim()) {
      // Only reset to idle if there's no active chat
      if (chatMessages.length === 0) {
        setMode('idle')
        setConversations([])
      }
      setResults([])
      return
    }

    // If we're in an active chat, stay in AI mode while typing follow-ups
    if (mode === 'ai' && chatMessages.length > 0) {
      return
    }

    // Local search — fires on every keystroke
    setMode('local')
    setIsLoading(true)
    ipcSearch(newQuery).then((searchResults) => {
      setResults(searchResults)
      setIsLoading(false)
    })
  }, [mode, chatMessages.length])

  const sendMessage = useCallback(() => {
    const text = query.replace(/^[>/]\s*/, '').trim()
    if (!text || isStreaming) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }

    setChatMessages(prev => [...prev, userMsg, assistantMsg])
    setMode('ai')
    setResults([])
    setConversations([])
    setIsStreaming(true)
    streamBufferRef.current = ''

    sendAIQuery('>' + text)
    setQueryState('')
  }, [query, isStreaming])

  const clearSearch = useCallback(() => {
    setQueryState('')
    setResults([])
    setMode('idle')
    setChatMessages([])
    setConversations([])
    setIsStreaming(false)
    streamBufferRef.current = ''
    // Start a new session when explicitly clearing
    ipcNewConversation()
  }, [])

  const showHistory = useCallback(() => {
    setQueryState('')
    setMode('history')
    setResults([])
    getConversations().then(setConversations)
  }, [])

  const selectConversation = useCallback((conv: Conversation) => {
    setConversations([])
    setQueryState('')
    // Load messages first, then switch to AI mode so the render has content
    ipcLoadConversation(conv.id).then(messages => {
      setChatMessages(messages)
      setMode('ai')
    })
  }, [])

  const startNewConversation = useCallback(() => {
    ipcNewConversation().then(() => {
      setQueryState('')
      setResults([])
      setMode('idle')
      setChatMessages([])
      setConversations([])
    })
  }, [])

  return {
    query,
    results,
    mode,
    isLoading,
    chatMessages,
    isStreaming,
    conversations,
    setQuery,
    sendMessage,
    clearSearch,
    showHistory,
    selectConversation,
    startNewConversation,
  }
}
