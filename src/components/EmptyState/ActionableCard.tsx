import type { KanbanCard, KanbanProject } from '@/lib/types'
import { openUrl, hideWindow } from '@/lib/ipc'
import { MONO, STATUS_COLOR, STATUS_SHORT, PRIORITY_LABEL, projectColor } from './constants'

export function ActionableCard({ card, projects }: { card: KanbanCard; projects: KanbanProject[] }) {
  const pColor = projectColor(card.projectSlug, projects)
  const priorityLabel = PRIORITY_LABEL[card.priority] || card.priority
  const statusColor = STATUS_COLOR[card.status] || 'rgba(255,255,255,0.2)'
  const isP0 = card.priority === 'P0 Today'

  const handleClick = () => {
    openUrl(`lk-kanban://card/${card.fullId}?project=${card.projectSlug}`)
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
        padding: '6px 8px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {/* Priority + status indicator */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingTop: '1px', flexShrink: 0 }}>
        <span style={{
          ...MONO,
          fontSize: '8.5px',
          fontWeight: 600,
          color: isP0 ? '#f59e0b' : 'rgba(255,255,255,0.22)',
          letterSpacing: '0.02em',
        }}>
          {priorityLabel}
        </span>
        <div style={{ width: '4px', height: '4px', borderRadius: '1px', background: statusColor, opacity: 0.5 }} />
      </div>

      {/* Title + project */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: '12px',
          fontWeight: isP0 ? 500 : 400,
          color: isP0 ? 'rgba(255, 250, 245, 0.75)' : 'rgba(255, 255, 255, 0.45)',
          display: 'block',
          lineHeight: '16px',
        }}>
          {card.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: pColor, opacity: 0.5, flexShrink: 0 }} />
          <span style={{ ...MONO, fontSize: '9px', color: 'rgba(255,255,255,0.16)' }}>
            {card.project}
          </span>
          <span style={{ ...MONO, fontSize: '9px', color: 'rgba(255,255,255,0.1)' }}>
            {STATUS_SHORT[card.status] || card.status}
          </span>
        </div>
      </div>
    </div>
  )
}
