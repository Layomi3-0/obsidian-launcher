import { useState, useEffect, useCallback } from 'react'
import type { SessionContext, Conversation, KanbanCard, KanbanProject } from '@/lib/types'
import { getConversations, getKanbanSummary } from '@/lib/ipc'
import { TIME_THEME, SECTION_LABEL, MONO, pickActionableItems } from './constants'
import { TimeHeader } from './BoardOverview'
import { BoardOverview } from './BoardOverview'
import { ActionableCard } from './ActionableCard'
import { ThreadRow, QuickActionStrip } from './ThreadRow'

type ConversationHandler = (conv: Conversation) => void

interface EmptyStateProps {
  context: SessionContext | null
  onQueryChange?: (query: string) => void
  onSelectConversation?: ConversationHandler
  onShowHistory?: () => void
}

export function EmptyState({ context, onQueryChange, onSelectConversation, onShowHistory }: EmptyStateProps) {
  const [cards, setCards] = useState<KanbanCard[]>([])
  const [projects, setProjects] = useState<KanbanProject[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])

  const timeOfDay = context?.timeOfDay ?? 'evening'
  const theme = TIME_THEME[timeOfDay]

  useEffect(() => {
    getKanbanSummary().then(summary => {
      setCards(summary.cards)
      setProjects(summary.projects)
    })
    getConversations().then(c => setConversations(c.slice(0, 3)))
  }, [context?.sessionId])

  const handleAction = useCallback((query: string) => {
    onQueryChange?.(query)
  }, [onQueryChange])

  const actionable = pickActionableItems(cards)
  let sectionCounter = 2

  return (
    <div
      className="animate-fade-in"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 24px 10px', overflowY: 'auto' }}
    >
      <TimeHeader theme={theme} />

      {cards.length > 0 && <BoardOverview cards={cards} />}

      {actionable.length > 0 && (
        <div className="dashboard-section" style={{ '--section-index': sectionCounter++, marginBottom: '12px' } as React.CSSProperties}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={SECTION_LABEL}>Up Next</span>
          </div>
          {actionable.map(card => (
            <ActionableCard key={card.id} card={card} projects={projects} />
          ))}
        </div>
      )}

      {conversations.length > 0 && (
        <div className="dashboard-section" style={{ '--section-index': sectionCounter++, marginBottom: '12px' } as React.CSSProperties}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={SECTION_LABEL}>Threads</span>
            <span
              className="no-drag"
              onClick={() => onShowHistory?.()}
              style={{
                ...MONO,
                fontSize: '9px',
                color: 'rgba(255, 255, 255, 0.14)',
                cursor: 'pointer',
                padding: '1px 6px',
                borderRadius: '3px',
                transition: 'color 0.12s ease, background 0.12s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.035)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.14)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              all →
            </span>
          </div>
          {conversations.map(conv => <ThreadRow key={conv.id} conv={conv} onSelect={onSelectConversation} />)}
        </div>
      )}

      {cards.length === 0 && conversations.length === 0 && (
        <div
          className="dashboard-section"
          style={{ '--section-index': 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties}
        >
          <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', lineHeight: '20px' }}>
            Search your vault, ask a question, or try a command
          </p>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div className="dashboard-section" style={{ '--section-index': sectionCounter, paddingTop: '6px' } as React.CSSProperties}>
        <div style={{ height: '0.5px', background: 'rgba(255, 255, 255, 0.035)', marginBottom: '10px' }} />
        <QuickActionStrip onAction={handleAction} />
      </div>
    </div>
  )
}
