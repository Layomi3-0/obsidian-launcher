import { useState, useCallback, useRef, useEffect } from 'react'
import type { Attachment, QueuedMessage } from '@/lib/types'
import { sendAIQuery, cancelAIQuery, onStreamChunk } from '@/lib/ipc'
import type { ChatMessage } from './useSearch'

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function updateLastAssistant(messages: ChatMessage[], updater: (msg: ChatMessage) => ChatMessage): ChatMessage[] {
  return messages.map((msg, i) =>
    i === messages.length - 1 && msg.role === 'assistant' ? updater(msg) : msg,
  )
}

export interface StreamHandlerReturn {
  chatMessages: ChatMessage[]
  isStreaming: boolean
  queuedMessages: QueuedMessage[]
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  dispatchQuery: (text: string, attachmentsForTurn: Attachment[]) => void
  enqueueMessage: (text: string, attachmentsForTurn: Attachment[]) => void
  cancelInflight: () => void
  removeQueuedMessage: (id: string) => void
  resetStream: () => void
}

export function useStreamHandler(): StreamHandlerReturn {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])

  const streamBufferRef = useRef('')
  const inflightIdRef = useRef<string | null>(null)
  const queueRef = useRef<QueuedMessage[]>([])
  const dispatchRef = useRef<(text: string, attachments: Attachment[]) => void>(() => {})

  useEffect(() => { queueRef.current = queuedMessages }, [queuedMessages])

  useEffect(() => {
    return onStreamChunk((data) => {
      if (data.requestId !== inflightIdRef.current) return

      if (data.done) {
        finalizeStream(data.interrupted === true)
        return
      }

      streamBufferRef.current += data.chunk
      const accumulated = streamBufferRef.current
      setChatMessages(prev => updateLastAssistant(prev, msg => ({ ...msg, content: accumulated })))
    })
  }, [])

  function finalizeStream(interrupted: boolean): void {
    const finalContent = streamBufferRef.current
    streamBufferRef.current = ''
    inflightIdRef.current = null

    setChatMessages(prev => {
      if (interrupted && finalContent.length === 0) {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.content === '') return prev.slice(0, -1)
      }
      return updateLastAssistant(prev, msg => ({
        ...msg, content: finalContent, interrupted: interrupted || msg.interrupted,
      }))
    })

    setIsStreaming(false)
    drainQueue()
  }

  function drainQueue(): void {
    const pending = queueRef.current
    if (pending.length === 0) return
    setQueuedMessages([])
    const combinedText = pending.map(m => m.content).join('\n\n')
    const combinedAttachments = pending.flatMap(m => m.attachments ?? [])
    dispatchRef.current(combinedText, combinedAttachments)
  }

  const dispatchQuery = useCallback((text: string, attachmentsForTurn: Attachment[]) => {
    const requestId = generateRequestId()
    inflightIdRef.current = requestId
    streamBufferRef.current = ''

    const hasAttachments = attachmentsForTurn.length > 0
    const userMsg: ChatMessage = {
      role: 'user',
      content: text || (hasAttachments ? `[${attachmentsForTurn.length} image${attachmentsForTurn.length > 1 ? 's' : ''} attached]` : ''),
      attachments: hasAttachments ? attachmentsForTurn : undefined,
    }

    setChatMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }])
    setIsStreaming(true)
    sendAIQuery(requestId, '>' + (text || 'Describe this image'), hasAttachments ? attachmentsForTurn : undefined)
  }, [])

  useEffect(() => { dispatchRef.current = dispatchQuery }, [dispatchQuery])

  const enqueueMessage = useCallback((text: string, attachmentsForTurn: Attachment[]) => {
    setQueuedMessages(prev => [...prev, {
      id: generateRequestId(),
      content: text,
      attachments: attachmentsForTurn.length > 0 ? attachmentsForTurn : undefined,
    }])
  }, [])

  const cancelInflight = useCallback(() => {
    const id = inflightIdRef.current
    if (!id) return
    cancelAIQuery(id)
    setChatMessages(prev => updateLastAssistant(prev, msg => ({ ...msg, interrupted: true })))
  }, [])

  const removeQueuedMessage = useCallback((id: string) => {
    setQueuedMessages(prev => prev.filter(m => m.id !== id))
  }, [])

  const resetStream = useCallback(() => {
    if (inflightIdRef.current) {
      cancelAIQuery(inflightIdRef.current)
      inflightIdRef.current = null
    }
    setChatMessages([])
    setQueuedMessages([])
    setIsStreaming(false)
    streamBufferRef.current = ''
  }, [])

  return {
    chatMessages, isStreaming, queuedMessages, setChatMessages,
    dispatchQuery, enqueueMessage, cancelInflight, removeQueuedMessage, resetStream,
  }
}
