import { useRef, useEffect } from 'react'
import type { Conversation } from '@/lib/types'

interface ConversationListProps {
  conversations: Conversation[]
  selectedIndex: number
  onSelect: (conversation: Conversation) => void
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr + 'Z')
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ConversationList({ conversations, selectedIndex, onSelect }: ConversationListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (conversations.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '13px',
        }}
      >
        No conversations yet
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '6px 0',
      }}
    >
      <div
        style={{
          padding: '6px 20px 10px',
          fontSize: '10.5px',
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.18)',
        }}
      >
        Recent conversations
      </div>

      {conversations.map((conv, i) => {
        const isSelected = i === selectedIndex
        return (
          <div
            key={conv.id}
            className="no-drag"
            onClick={() => onSelect(conv)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 20px',
              cursor: 'pointer',
              background: isSelected ? 'rgba(168, 140, 255, 0.1)' : 'transparent',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'transparent'
            }}
          >
            {/* Chat icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{ flexShrink: 0, opacity: isSelected ? 0.8 : 0.3 }}
            >
              <path
                d="M2.5 2.5H11.5V9.5H7L4.5 11.5V9.5H2.5V2.5Z"
                stroke={isSelected ? '#a88cff' : 'currentColor'}
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>

            {/* Title */}
            <span
              style={{
                flex: 1,
                color: isSelected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                fontSize: '13px',
                fontWeight: isSelected ? 500 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {conv.title || 'Untitled'}
            </span>

            {/* Meta: message count + time */}
            <span
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255,255,255,0.2)',
                fontSize: '11px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>{conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}</span>
              <span>{relativeTime(conv.updated_at)}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
