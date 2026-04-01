import { useState, useCallback } from 'react'
import { SearchInput } from './components/SearchInput'
import { ResultsList } from './components/ResultsList'
import { AIResponse } from './components/AIResponse'
import { EmptyState } from './components/EmptyState'
import { PreviewPane } from './components/PreviewPane'
import { StatusBar } from './components/StatusBar'
import { CommandPalette, filterCommands } from './components/CommandPalette'
import { ConversationList } from './components/ConversationList'
import type { SlashCommand } from './components/CommandPalette'
import { useSearch } from './hooks/useSearch'
import { useKeyboard } from './hooks/useKeyboard'
import { useSession } from './hooks/useSession'
import { openNote, hideWindow } from './lib/ipc'
import type { SearchResult, Conversation } from './lib/types'

export function App() {
  const {
    query, results, mode, chatMessages, isStreaming, conversations,
    setQuery, sendMessage, clearSearch, showHistory, selectConversation, startNewConversation,
  } = useSearch()
  const { selectedIndex, setSelectedIndex, handleKeyDown } = useKeyboard({
    results,
    onClearSearch: clearSearch,
  })
  const { context } = useSession()
  const [previewVisible, setPreviewVisible] = useState(false)
  const [cmdIndex, setCmdIndex] = useState(0)

  const selectedResult = results[selectedIndex] || null

  const isSlashMode = query.startsWith('/') && chatMessages.length === 0 && !isStreaming && mode !== 'history'
  const filteredCommands = isSlashMode ? filterCommands(query) : []

  const [convIndex, setConvIndex] = useState(0)

  const selectCommand = useCallback(
    (cmd: SlashCommand) => {
      // Handle special commands that trigger actions
      if (cmd.name === '/history') {
        showHistory()
        setConvIndex(0)
        return
      }
      if (cmd.name === '/new') {
        startNewConversation()
        return
      }
      setQuery(cmd.name + ' ')
      setCmdIndex(0)
    },
    [setQuery, showHistory, startNewConversation],
  )

  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      selectConversation(conv)
      setConvIndex(0)
    },
    [selectConversation],
  )

  const executeResult = useCallback(
    (result: SearchResult) => {
      openNote(result.path)
      clearSearch()
      hideWindow()
    },
    [clearSearch],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Slash command navigation
      if (isSlashMode && filteredCommands.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setCmdIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setCmdIndex(prev => Math.max(prev - 1, 0))
          return
        }
        if (e.key === 'Tab') {
          e.preventDefault()
          selectCommand(filteredCommands[cmdIndex])
          return
        }
        if (e.key === 'Enter' && query === filteredCommands[cmdIndex]?.name) {
          // Exact match — don't send yet, autocomplete with space
          e.preventDefault()
          selectCommand(filteredCommands[cmdIndex])
          return
        }
      }

      if (e.key === 'Tab' && mode === 'local') {
        e.preventDefault()
        setPreviewVisible((prev) => !prev)
        return
      }

      // In AI mode, Enter sends the message
      if (e.key === 'Enter' && mode === 'ai') {
        e.preventDefault()
        sendMessage()
        return
      }

      // History mode navigation
      if (mode === 'history' && conversations.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setConvIndex(prev => Math.min(prev + 1, conversations.length - 1))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setConvIndex(prev => Math.max(prev - 1, 0))
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          handleSelectConversation(conversations[convIndex])
          return
        }
      }

      // Escape clears chat / history and returns to idle
      if (e.key === 'Escape') {
        e.preventDefault()
        clearSearch()
        if (chatMessages.length === 0 && mode !== 'history') {
          hideWindow()
        }
        return
      }

      handleKeyDown(e)
    },
    [handleKeyDown, mode, sendMessage, clearSearch, chatMessages.length, isSlashMode, filteredCommands, cmdIndex, query, selectCommand, conversations, convIndex, handleSelectConversation],
  )

  // Reset command index when filter changes
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery)
      setCmdIndex(0)
    },
    [setQuery],
  )

  const showCommands = isSlashMode && filteredCommands.length > 0
  const showConversations = mode === 'history'
  const showResults = mode === 'local' && results.length > 0
  const showAI = mode === 'ai' && !showCommands
  const showEmpty = mode === 'idle'

  return (
    <div
      className="launcher-window glass"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SearchInput
        query={query}
        mode={mode}
        onQueryChange={handleQueryChange}
        onKeyDown={onKeyDown}
      />

      <div className="no-drag" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          {showEmpty && <EmptyState context={context} onQueryChange={handleQueryChange} onSelectConversation={handleSelectConversation} onShowHistory={showHistory} />}

          {showCommands && (
            <CommandPalette
              filter={query}
              selectedIndex={cmdIndex}
              onSelect={selectCommand}
            />
          )}

          {showConversations && (
            <ConversationList
              conversations={conversations}
              selectedIndex={convIndex}
              onSelect={handleSelectConversation}
            />
          )}

          {showResults && (
            <ResultsList
              results={results}
              selectedIndex={selectedIndex}
              query={query}
              onSelectIndex={setSelectedIndex}
              onExecuteResult={executeResult}
            />
          )}

          {showAI && (
            <AIResponse messages={chatMessages} isStreaming={isStreaming} />
          )}
        </div>

        {showResults && (
          <PreviewPane result={selectedResult} visible={previewVisible} />
        )}
      </div>

      <StatusBar mode={mode} resultCount={results.length} />
    </div>
  )
}
