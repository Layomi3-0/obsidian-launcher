import type { SearchResult } from '@/lib/types'
import { MATCH_TYPE_CONFIG, TAG_COLORS, TAG_TEXT_COLORS, NoteIcon } from './constants'

interface ResultItemProps {
  result: SearchResult
  isSelected: boolean
  query: string
  onSelect: () => void
  onClick: () => void
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} style={{ color: '#a88cff', fontWeight: 500 }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`
  return `${Math.floor(diffDays / 30)}mo`
}

export function ResultItem({ result, isSelected, query, onSelect, onClick }: ResultItemProps) {
  const matchConfig = MATCH_TYPE_CONFIG[result.matchType]

  return (
    <div
      className="result-item"
      onMouseEnter={onSelect}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '10px 16px',
        cursor: 'pointer',
        borderRadius: '8px',
        margin: '0 6px',
        transition: 'background 0.1s ease',
        background: isSelected ? 'rgba(255, 255, 255, 0.055)' : 'transparent',
        ...(isSelected
          ? {
              boxShadow:
                'inset 0 0 0 0.5px rgba(255, 255, 255, 0.07), 0 1px 3px rgba(0,0,0,0.1)',
            }
          : {}),
      }}
    >
      <NoteIcon matchType={result.matchType} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '3px',
          }}
        >
          <span
            style={{
              color: isSelected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
              fontSize: '13.5px',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'color 0.1s ease',
            }}
          >
            {highlightMatch(result.title, query)}
          </span>

          {/* Match type dot */}
          <div
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: matchConfig.color,
              opacity: 0.5,
              flexShrink: 0,
            }}
            title={matchConfig.label}
          />

          <span
            style={{
              marginLeft: 'auto',
              color: 'rgba(255,255,255,0.28)',
              fontSize: '11px',
              fontWeight: 400,
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {relativeTime(result.lastModified)}
          </span>
        </div>

        {/* Snippet */}
        <div
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '12px',
            lineHeight: '17px',
            letterSpacing: '0.002em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '5px',
          }}
        >
          {result.snippet}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {result.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '10.5px',
                fontWeight: 500,
                letterSpacing: '0.01em',
                background: TAG_COLORS[tag] || 'rgba(255,255,255,0.05)',
                color: TAG_TEXT_COLORS[tag] || 'rgba(255,255,255,0.4)',
                lineHeight: '16px',
              }}
            >
              {tag}
            </span>
          ))}

          {/* Path breadcrumb */}
          <span
            style={{
              display: 'inline-block',
              padding: '1px 0',
              fontSize: '10.5px',
              color: 'rgba(255,255,255,0.2)',
              marginLeft: result.tags.length > 0 ? '4px' : '0',
            }}
          >
            {result.path.split('/').slice(0, -1).join(' / ')}
          </span>
        </div>
      </div>
    </div>
  )
}
