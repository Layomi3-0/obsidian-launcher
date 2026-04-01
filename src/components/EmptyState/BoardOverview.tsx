import type { KanbanCard } from '@/lib/types'
import {
  MONO, SECTION_LABEL, STATUS_ORDER, STATUS_SHORT, STATUS_COLOR,
  formatHeaderDate, buildBoardSummary,
} from './constants'
import type { TimeTheme } from './constants'

export function TimeHeader({ theme }: { theme: TimeTheme }) {
  return (
    <div className="dashboard-section" style={{ '--section-index': 0 } as React.CSSProperties}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ ...MONO, fontSize: '10px', fontWeight: 450, letterSpacing: '0.1em', color: 'rgba(255, 255, 255, 0.2)' }}>
          {formatHeaderDate()}
        </span>
        <span style={{ ...MONO, fontSize: '10px', fontWeight: 450, letterSpacing: '0.1em', color: theme.accentDim }}>
          {theme.label}
        </span>
      </div>
      <div
        className="ambient-line"
        style={{
          height: '1px',
          background: `linear-gradient(90deg, ${theme.lineGradient}, ${theme.lineGradient.replace(/[\d.]+\)$/, '0.12)')} 65%, transparent)`,
          marginBottom: '14px',
        }}
      />
    </div>
  )
}

export function BoardOverview({ cards }: { cards: KanbanCard[] }) {
  const { total, counts } = buildBoardSummary(cards)

  return (
    <div className="dashboard-section" style={{ '--section-index': 1, marginBottom: '14px' } as React.CSSProperties}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={SECTION_LABEL}>Board</span>
        <span style={{ ...MONO, fontSize: '9px', color: 'rgba(255, 255, 255, 0.12)' }}>{total} active</span>
      </div>
      <div style={{ display: 'flex', gap: '3px', marginBottom: '10px', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
        {STATUS_ORDER.map(status => {
          const count = counts[status] || 0
          if (count === 0) return null
          return (
            <div
              key={status}
              title={`${status}: ${count}`}
              style={{
                flex: count,
                background: STATUS_COLOR[status] || 'rgba(255,255,255,0.1)',
                opacity: 0.6,
                borderRadius: '1px',
              }}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {STATUS_ORDER.map(status => {
          const count = counts[status] || 0
          if (count === 0) return null
          return (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '1px', background: STATUS_COLOR[status], opacity: 0.5 }} />
              <span style={{ ...MONO, fontSize: '9.5px', color: 'rgba(255,255,255,0.3)' }}>
                {STATUS_SHORT[status]} {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
