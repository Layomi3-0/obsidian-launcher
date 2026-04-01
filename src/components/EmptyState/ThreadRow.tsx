import type { Conversation } from '@/lib/types'
import { MONO, relativeTime } from './constants'

type ConversationHandler = (conv: Conversation) => void

export function ThreadRow({ conv, onSelect }: { conv: Conversation; onSelect?: ConversationHandler }) {
  return (
    <div
      className="no-drag"
      onClick={() => onSelect?.(conv)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 6px',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ color: 'rgba(168, 140, 255, 0.28)', fontSize: '5px', lineHeight: 1, flexShrink: 0 }}>●</span>
      <span style={{ flex: 1, fontSize: '12px', color: 'rgba(255, 255, 255, 0.36)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {conv.title || 'Untitled thread'}
      </span>
      <span style={{ ...MONO, fontSize: '10px', color: 'rgba(255, 255, 255, 0.1)', flexShrink: 0 }}>
        {relativeTime(conv.updated_at)}
      </span>
    </div>
  )
}

export function QuickActionStrip({ onAction }: { onAction: (query: string) => void }) {
  const actions = [
    { label: '/briefing', query: '/briefing ' },
    { label: '/capture', query: '/capture ' },
    { label: '> ask anything', query: '> ' },
  ]

  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
      {actions.map(action => (
        <span
          key={action.label}
          onClick={() => onAction(action.query)}
          className="no-drag"
          style={{
            ...MONO,
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.14)',
            cursor: 'pointer',
            padding: '3px 10px',
            borderRadius: '4px',
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
          {action.label}
        </span>
      ))}
    </div>
  )
}
