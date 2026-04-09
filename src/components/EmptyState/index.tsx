import { useState, useEffect, useCallback } from 'react'
import type { SessionContext, Conversation, KanbanCard, KanbanProject, ProjectSummary } from '@/lib/types'
import { getConversations, getKanbanSummary, getProjectSummary, openNote, hideWindow } from '@/lib/ipc'
import { TIME_THEME, SECTION_LABEL, MONO, pickActionableItems } from './constants'
import { TimeHeader } from './BoardOverview'
import { BoardOverview } from './BoardOverview'
import { ActionableCard } from './ActionableCard'
import { ThreadRow, QuickActionStrip } from './ThreadRow'

type ConversationHandler = (conv: Conversation) => void

interface EmptyStateProps {
  context: SessionContext | null
  kanbanEnabled: boolean
  onQueryChange?: (query: string) => void
  onSelectConversation?: ConversationHandler
  onShowHistory?: () => void
}

export function EmptyState({ context, kanbanEnabled, onQueryChange, onSelectConversation, onShowHistory }: EmptyStateProps) {
  const [cards, setCards] = useState<KanbanCard[]>([])
  const [projects, setProjects] = useState<KanbanProject[]>([])
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])

  const timeOfDay = context?.timeOfDay ?? 'evening'
  const theme = TIME_THEME[timeOfDay]

  useEffect(() => {
    if (kanbanEnabled) {
      getKanbanSummary().then(summary => {
        setCards(summary.cards)
        setProjects(summary.projects)
      })
    } else {
      getProjectSummary().then(result => {
        setProjectSummaries(result.projects)
      })
    }
    getConversations().then(c => setConversations(c.slice(0, 3)))
  }, [context?.sessionId, kanbanEnabled])

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

      {kanbanEnabled && cards.length > 0 && <BoardOverview cards={cards} />}

      {kanbanEnabled && actionable.length > 0 && (
        <div className="dashboard-section" style={{ '--section-index': sectionCounter++, marginBottom: '12px' } as React.CSSProperties}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={SECTION_LABEL}>Up Next</span>
          </div>
          {actionable.map(card => (
            <ActionableCard key={card.id} card={card} projects={projects} />
          ))}
        </div>
      )}

      {!kanbanEnabled && projectSummaries.length > 0 && (
        <ProjectOverview projects={projectSummaries} sectionIndex={sectionCounter++} />
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
              all &rarr;
            </span>
          </div>
          {conversations.map(conv => <ThreadRow key={conv.id} conv={conv} onSelect={onSelectConversation} />)}
        </div>
      )}

      {cards.length === 0 && projectSummaries.length === 0 && conversations.length === 0 && (
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

// ── Project Overview (non-kanban users) ──

const STATUS_INDICATORS: Record<string, string> = {
  Active: '#60a5fa',
  Stale: '#fbbf24',
}

function ProjectOverview({ projects, sectionIndex }: { projects: ProjectSummary[]; sectionIndex: number }) {
  return (
    <div className="dashboard-section" style={{ '--section-index': sectionIndex, marginBottom: '12px' } as React.CSSProperties}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={SECTION_LABEL}>Projects</span>
        <span style={{ ...MONO, fontSize: '9px', color: 'rgba(255, 255, 255, 0.12)' }}>
          {projects.length} active
        </span>
      </div>

      {projects.map(project => (
        <ProjectRow key={project.path} project={project} />
      ))}
    </div>
  )
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  const dotColor = project.isStale ? STATUS_INDICATORS.Stale : STATUS_INDICATORS.Active

  const handleClick = () => {
    openNote(project.path)
    hideWindow()
  }

  return (
    <div
      className="no-drag"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '6px',
        marginBottom: '2px',
        cursor: 'pointer',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        background: dotColor,
        opacity: 0.6,
        marginTop: '5px',
        flexShrink: 0,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: '2px',
        }}>
          {project.name}
        </div>

        <div style={{
          fontSize: '10.5px',
          color: 'rgba(255, 255, 255, 0.25)',
          lineHeight: '16px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {project.status}
        </div>

        {project.nextAction && project.nextAction !== 'No open tasks' && (
          <div style={{
            ...MONO,
            fontSize: '9.5px',
            color: 'rgba(168, 140, 255, 0.35)',
            marginTop: '3px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            &rarr; {project.nextAction}
          </div>
        )}
      </div>

      <div style={{
        ...MONO,
        fontSize: '9px',
        color: 'rgba(255, 255, 255, 0.1)',
        flexShrink: 0,
        marginTop: '2px',
      }}>
        {project.lastActivity}
      </div>
    </div>
  )
}
