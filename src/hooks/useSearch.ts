import { useState, useCallback, useRef, useEffect } from 'react'
import type { SearchResult, Conversation, Attachment } from '@/lib/types'
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
  attachments?: Attachment[]
}

interface UseSearchReturn {
  query: string
  results: SearchResult[]
  mode: SearchMode
  isLoading: boolean
  chatMessages: ChatMessage[]
  isStreaming: boolean
  conversations: Conversation[]
  attachments: Attachment[]
  setQuery: (query: string) => void
  sendMessage: () => void
  clearSearch: () => void
  showHistory: () => void
  selectConversation: (conv: Conversation) => void
  startNewConversation: () => void
  addAttachments: (files: Attachment[]) => void
  removeAttachment: (id: string) => void
}

export function useSearch(): UseSearchReturn {
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [mode, setMode] = useState<SearchMode>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const streamBufferRef = useRef('')

  // On hide: clear transient search results and history list, but preserve query text and chat
  useEffect(() => {
    return onWindowHidden(() => {
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
    if ((!text && attachments.length === 0) || isStreaming) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: text || (attachments.length > 0 ? `[${attachments.length} image${attachments.length > 1 ? 's' : ''} attached]` : ''),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    }
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }

    setChatMessages(prev => [...prev, userMsg, assistantMsg])
    setMode('ai')
    setResults([])
    setConversations([])
    setIsStreaming(true)
    streamBufferRef.current = ''

    sendAIQuery('>' + (text || 'Describe this image'), attachments.length > 0 ? attachments : undefined)
    setQueryState('')
    setAttachments([])
  }, [query, isStreaming, attachments])

  const clearSearch = useCallback(() => {
    setQueryState('')
    setResults([])
    setMode('idle')
    setChatMessages([])
    setConversations([])
    setAttachments([])
    setIsStreaming(false)
    streamBufferRef.current = ''
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
      setAttachments([])
    })
  }, [])

  const addAttachments = useCallback((files: Attachment[]) => {
    setAttachments(prev => [...prev, ...files])
    if (mode === 'idle' || mode === 'local') {
      setMode('ai')
      setResults([])
    }
  }, [mode])

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const next = prev.filter(a => a.id !== id)
      if (next.length === 0 && !query.startsWith('>') && !query.startsWith('/') && chatMessages.length === 0) {
        setMode('idle')
      }
      return next
    })
  }, [query, chatMessages.length])

  return {
    query,
    results,
    mode,
    isLoading,
    chatMessages,
    isStreaming,
    conversations,
    attachments,
    setQuery,
    sendMessage,
    clearSearch,
    showHistory,
    selectConversation,
    startNewConversation,
    addAttachments,
    removeAttachment,
  }
}
