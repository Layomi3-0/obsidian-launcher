import { useState, useCallback } from 'react'
import type { SlashCommand } from '@/components/CommandPalette'
import { filterCommands } from '@/components/CommandPalette'
import type { SearchResult, Conversation } from '@/lib/types'
import { openNote, hideWindow } from '@/lib/ipc'

interface UseAppKeyboardParams {
  query: string
  mode: string
  chatMessages: { role: string }[]
  isStreaming: boolean
  conversations: Conversation[]
  queuedMessages: { id: string }[]
  results: SearchResult[]
  setQuery: (q: string) => void
  sendMessage: () => void
  cancelInflight: () => void
  removeQueuedMessage: (id: string) => void
  clearSearch: () => void
  showHistory: () => void
  selectConversation: (conv: Conversation) => void
  startNewConversation: () => void
  handleKeyDown: (e: React.KeyboardEvent) => void
}

export function useAppKeyboard(params: UseAppKeyboardParams) {
  const [cmdIndex, setCmdIndex] = useState(0)
  const [convIndex, setConvIndex] = useState(0)
  const [previewVisible, setPreviewVisible] = useState(false)

  const isSlashMode = params.query.startsWith('/') && params.chatMessages.length === 0 && !params.isStreaming && params.mode !== 'history'
  const filteredCommands = isSlashMode ? filterCommands(params.query) : []

  const selectCommand = useCallback((cmd: SlashCommand) => {
    if (cmd.name === '/history') {
      params.showHistory()
      setConvIndex(0)
      return
    }
    if (cmd.name === '/new') {
      params.startNewConversation()
      return
    }
    params.setQuery(cmd.name + ' ')
    setCmdIndex(0)
  }, [params.setQuery, params.showHistory, params.startNewConversation])

  const handleSelectConversation = useCallback((conv: Conversation) => {
    params.selectConversation(conv)
    setConvIndex(0)
  }, [params.selectConversation])

  const executeResult = useCallback((result: SearchResult) => {
    openNote(result.path)
    params.clearSearch()
    hideWindow()
  }, [params.clearSearch])

  const handleQueryChange = useCallback((newQuery: string) => {
    params.setQuery(newQuery)
    setCmdIndex(0)
  }, [params.setQuery])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (handleSlashNav(e, isSlashMode, filteredCommands, cmdIndex, setCmdIndex, selectCommand, params.query)) return
    if (handlePreviewToggle(e, params.mode, setPreviewVisible)) return
    if (handleAISend(e, params.mode, params.sendMessage)) return
    if (handleCancel(e, params.isStreaming, params.cancelInflight)) return
    if (handleHistoryNav(e, params.mode, params.conversations, convIndex, setConvIndex, handleSelectConversation)) return
    if (handleEscape(e, params)) return
    params.handleKeyDown(e)
  }, [
    params.handleKeyDown, params.mode, params.sendMessage, params.clearSearch, params.chatMessages.length,
    isSlashMode, filteredCommands, cmdIndex, params.query, selectCommand, params.conversations, convIndex,
    handleSelectConversation, params.isStreaming, params.cancelInflight, params.queuedMessages, params.removeQueuedMessage,
  ])

  return {
    cmdIndex, convIndex, previewVisible, isSlashMode, filteredCommands,
    selectCommand, handleSelectConversation, executeResult, handleQueryChange, onKeyDown,
  }
}

function handleSlashNav(
  e: React.KeyboardEvent, isSlashMode: boolean, commands: SlashCommand[],
  cmdIndex: number, setCmdIndex: (fn: (n: number) => number) => void,
  selectCommand: (cmd: SlashCommand) => void, query: string,
): boolean {
  if (!isSlashMode || commands.length === 0) return false

  if (e.key === 'ArrowDown') { e.preventDefault(); setCmdIndex(i => Math.min(i + 1, commands.length - 1)); return true }
  if (e.key === 'ArrowUp') { e.preventDefault(); setCmdIndex(i => Math.max(i - 1, 0)); return true }
  if (e.key === 'Tab') { e.preventDefault(); selectCommand(commands[cmdIndex]); return true }
  if (e.key === 'Enter' && query === commands[cmdIndex]?.name) { e.preventDefault(); selectCommand(commands[cmdIndex]); return true }

  return false
}

function handlePreviewToggle(e: React.KeyboardEvent, mode: string, setPreviewVisible: (fn: (v: boolean) => boolean) => void): boolean {
  if (e.key === 'Tab' && mode === 'local') { e.preventDefault(); setPreviewVisible(v => !v); return true }
  return false
}

function handleAISend(e: React.KeyboardEvent, mode: string, sendMessage: () => void): boolean {
  if (e.key === 'Enter' && mode === 'ai') { e.preventDefault(); sendMessage(); return true }
  return false
}

function handleCancel(e: React.KeyboardEvent, isStreaming: boolean, cancelInflight: () => void): boolean {
  if (e.key === 'c' && e.ctrlKey && isStreaming) {
    const hasSelection = (window.getSelection()?.toString().length ?? 0) > 0
    if (!hasSelection) { e.preventDefault(); cancelInflight(); return true }
  }
  return false
}

function handleHistoryNav(
  e: React.KeyboardEvent, mode: string, conversations: Conversation[],
  convIndex: number, setConvIndex: (fn: (n: number) => number) => void,
  selectConversation: (conv: Conversation) => void,
): boolean {
  if (mode !== 'history' || conversations.length === 0) return false

  if (e.key === 'ArrowDown') { e.preventDefault(); setConvIndex(i => Math.min(i + 1, conversations.length - 1)); return true }
  if (e.key === 'ArrowUp') { e.preventDefault(); setConvIndex(i => Math.max(i - 1, 0)); return true }
  if (e.key === 'Enter') { e.preventDefault(); selectConversation(conversations[convIndex]); return true }

  return false
}

function handleEscape(e: React.KeyboardEvent, params: UseAppKeyboardParams): boolean {
  if (e.key !== 'Escape') return false
  e.preventDefault()

  if (params.isStreaming) { params.cancelInflight(); return true }
  if (params.queuedMessages.length > 0) { params.queuedMessages.forEach(m => params.removeQueuedMessage(m.id)); return true }

  params.clearSearch()
  if (params.chatMessages.length === 0 && params.mode !== 'history') hideWindow()
  return true
}
