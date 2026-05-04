import { useState } from 'react'
import type { ConnectionStatus } from '@/lib/types'
import { HistoryMenu } from './HistoryMenu'

interface HeaderProps {
  status: ConnectionStatus
  statusError: string | null
  onNewChat: () => void
  onLoadConversation: (id: string) => void
}

export function Header({ status, statusError, onNewChat, onLoadConversation }: HeaderProps) {
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <div className="qlx-header">
      <span className={`qlx-status-dot ${status}`} />
      <span className="qlx-header-title">Quick Launcher</span>
      <span className="qlx-header-status" title={statusError ?? ''}>{labelFor(status)}</span>
      <div className="qlx-header-actions">
        <IconButton title="New chat (⌘N)" onClick={onNewChat}><PlusIcon /></IconButton>
        <IconButton title="Chat history" onClick={() => setHistoryOpen((v) => !v)} active={historyOpen}>
          <HistoryIcon />
        </IconButton>
        <IconButton title="Settings" onClick={() => chrome.runtime.openOptionsPage()}>
          <GearIcon />
        </IconButton>
      </div>
      {historyOpen && (
        <HistoryMenu
          onSelect={(id) => { setHistoryOpen(false); onLoadConversation(id) }}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  )
}

function IconButton({ title, onClick, active, children }: { title: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      className={`qlx-icon-button${active ? ' active' : ''}`}
    >
      {children}
    </button>
  )
}

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M6 2.5V9.5M2.5 6H9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M2 3.5H10M2 6H10M2 8.5H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="1.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 1.5V3M6 9V10.5M10.5 6H9M3 6H1.5M9.18 2.82L8.12 3.88M3.88 8.12L2.82 9.18M9.18 9.18L8.12 8.12M3.88 3.88L2.82 2.82" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

function labelFor(status: ConnectionStatus): string {
  if (status === 'connected') return 'Live'
  if (status === 'connecting') return 'Connecting'
  if (status === 'unauthorized') return 'Unpaired'
  if (status === 'error') return 'Offline'
  return 'Idle'
}
