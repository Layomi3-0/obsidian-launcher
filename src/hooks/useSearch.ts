import { useState, useCallback, useEffect } from 'react'
import type { SearchResult, Conversation, Attachment } from '@/lib/types'
import {
  search as ipcSearch,
  onWindowHidden,
  getConversations,
  loadConversation as ipcLoadConversation,
  newConversation as ipcNewConversation,
} from '@/lib/ipc'
import { useStreamHandler } from './useStreamHandler'

type SearchMode = 'local' | 'ai' | 'idle' | 'history'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  attachments?: Attachment[]
  interrupted?: boolean
}

export function useSearch() {
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [mode, setMode] = useState<SearchMode>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const stream = useStreamHandler()

  useEffect(() => {
    return onWindowHidden(() => { setResults([]); setConversations([]) })
  }, [])

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery)

    if (isAIPrefix(newQuery)) {
      if (mode !== 'ai' && mode !== 'history') { setMode('ai'); setResults([]) }
      return
    }

    if (!newQuery.trim()) {
      if (stream.chatMessages.length === 0) { setMode('idle'); setConversations([]) }
      setResults([])
      return
    }

    if (mode === 'ai' && stream.chatMessages.length > 0) return

    setMode('local')
    setIsLoading(true)
    ipcSearch(newQuery).then(r => { setResults(r); setIsLoading(false) })
  }, [mode, stream.chatMessages.length])

  const sendMessage = useCallback(() => {
    const text = query.replace(/^[>/]\s*/, '').trim()
    if (!text && attachments.length === 0) return

    const turnAttachments = [...attachments]
    setQueryState('')
    setAttachments([])

    if (stream.isStreaming) {
      stream.enqueueMessage(text, turnAttachments)
      return
    }

    setMode('ai')
    setResults([])
    setConversations([])
    stream.dispatchQuery(text, turnAttachments)
  }, [query, stream.isStreaming, attachments, stream.enqueueMessage, stream.dispatchQuery])

  const clearSearch = useCallback(() => {
    stream.resetStream()
    setQueryState('')
    setResults([])
    setMode('idle')
    setConversations([])
    setAttachments([])
    ipcNewConversation()
  }, [stream.resetStream])

  const showHistory = useCallback(() => {
    setQueryState('')
    setMode('history')
    setResults([])
    getConversations().then(setConversations)
  }, [])

  const selectConversation = useCallback((conv: Conversation) => {
    setConversations([])
    setQueryState('')
    ipcLoadConversation(conv.id).then(messages => {
      stream.setChatMessages(messages)
      setMode('ai')
    })
  }, [stream.setChatMessages])

  const startNewConversation = useCallback(() => {
    stream.resetStream()
    ipcNewConversation().then(() => {
      setQueryState('')
      setResults([])
      setMode('idle')
      setConversations([])
      setAttachments([])
    })
  }, [stream.resetStream])

  const addAttachments = useCallback((files: Attachment[]) => {
    setAttachments(prev => [...prev, ...files])
    if (mode === 'idle' || mode === 'local') { setMode('ai'); setResults([]) }
  }, [mode])

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const next = prev.filter(a => a.id !== id)
      if (next.length === 0 && !isAIPrefix(query) && stream.chatMessages.length === 0) setMode('idle')
      return next
    })
  }, [query, stream.chatMessages.length])

  return {
    query, results, mode, isLoading, attachments,
    chatMessages: stream.chatMessages,
    isStreaming: stream.isStreaming,
    queuedMessages: stream.queuedMessages,
    conversations,
    setQuery, sendMessage, clearSearch, showHistory,
    selectConversation, startNewConversation,
    cancelInflight: stream.cancelInflight,
    removeQueuedMessage: stream.removeQueuedMessage,
    addAttachments, removeAttachment,
  }
}

function isAIPrefix(query: string): boolean {
  return query.startsWith('>') || query.startsWith('/')
}
