import { useState, useCallback, useEffect } from 'react'
import { SearchInput } from './components/SearchInput'
import { ResultsList } from './components/ResultsList'
import { AIResponse } from './components/AIResponse'
import { QueueIndicator } from './components/AIResponse/QueueIndicator'
import { EmptyState } from './components/EmptyState'
import { PreviewPane } from './components/PreviewPane'
import { StatusBar } from './components/StatusBar'
import { CommandPalette } from './components/CommandPalette'
import { ConversationList } from './components/ConversationList'
import { Onboarding } from './components/Onboarding'
import { useSearch } from './hooks/useSearch'
import { useKeyboard } from './hooks/useKeyboard'
import { useSession } from './hooks/useSession'
import { useAppKeyboard } from './hooks/useAppKeyboard'
import { setCompact, setExpanded, onCompactChange, getSettings, saveSettings, pickFolder, validateApiKey, initServices } from './lib/ipc'
import type { AppSettings } from './lib/types'

export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    getSettings().then(s => { setSettings(s); setOnboarded(s.onboarded) })
  }, [])

  useEffect(() => onCompactChange(setIsCompact), [])

  const search = useSearch()
  const { selectedIndex, setSelectedIndex, handleKeyDown } = useKeyboard({ results: search.results, onClearSearch: search.clearSearch })
  const { context } = useSession()

  const keyboard = useAppKeyboard({ ...search, handleKeyDown })

  useEffect(() => {
    if (isCompact && search.isStreaming) setExpanded()
  }, [isCompact, search.isStreaming])

  const handleOnboardingComplete = useCallback(async (result: { vaultPath: string; apiKey: string; provider: 'gemini' | 'claude' }) => {
    const newSettings: AppSettings = { ...result, onboarded: true, kanbanEnabled: false, kanbanPath: '', projectsFolder: 'Projects' }
    await saveSettings(newSettings)
    await initServices()
    setSettings(newSettings)
    setOnboarded(true)
  }, [])

  if (onboarded === null) return <div className="launcher-window glass" style={{ width: '100%', height: '100%' }} />

  if (!onboarded) {
    return (
      <div className="launcher-window glass" style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Onboarding onPickFolder={pickFolder} onValidateKey={validateApiKey} onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  const showCommands = keyboard.isSlashMode && keyboard.filteredCommands.length > 0
  const showConversations = search.mode === 'history'
  const showResults = search.mode === 'local' && search.results.length > 0
  const showAI = search.mode === 'ai' && !showCommands
  const showEmpty = search.mode === 'idle'
  const selectedResult = search.results[selectedIndex] || null

  return (
    <div className="launcher-window glass" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SearchInput
        query={search.query} mode={search.mode}
        onQueryChange={keyboard.handleQueryChange} onKeyDown={keyboard.onKeyDown}
        isCompact={isCompact} onToggleCompact={() => isCompact ? setExpanded() : setCompact()}
        attachments={search.attachments} onAddAttachments={search.addAttachments} onRemoveAttachment={search.removeAttachment}
      />

      {!isCompact && search.queuedMessages.length > 0 && (
        <QueueIndicator messages={search.queuedMessages} onRemove={search.removeQueuedMessage} />
      )}

      {!isCompact && (
        <>
          <div className="no-drag" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {showEmpty && (
                <EmptyState context={context} kanbanEnabled={settings?.kanbanEnabled ?? false}
                  onQueryChange={keyboard.handleQueryChange} onSelectConversation={keyboard.handleSelectConversation} onShowHistory={search.showHistory} />
              )}
              {showCommands && <CommandPalette filter={search.query} selectedIndex={keyboard.cmdIndex} onSelect={keyboard.selectCommand} />}
              {showConversations && <ConversationList conversations={search.conversations} selectedIndex={keyboard.convIndex} onSelect={keyboard.handleSelectConversation} />}
              {showResults && <ResultsList results={search.results} selectedIndex={selectedIndex} query={search.query} onSelectIndex={setSelectedIndex} onExecuteResult={keyboard.executeResult} />}
              {showAI && <AIResponse messages={search.chatMessages} isStreaming={search.isStreaming} />}
            </div>
            {showResults && <PreviewPane result={selectedResult} visible={keyboard.previewVisible} />}
          </div>
          <StatusBar mode={search.mode} resultCount={search.results.length} />
        </>
      )}
    </div>
  )
}
