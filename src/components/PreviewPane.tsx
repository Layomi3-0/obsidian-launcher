import type { SearchResult } from '@/lib/types'

interface PreviewPaneProps {
  result: SearchResult | null
  visible: boolean
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function PreviewPane({ result, visible }: PreviewPaneProps) {
  if (!visible || !result) return null

  return (
    <div
      className="animate-slide-in-right"
      style={{
        width: '280px',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <h3
          style={{
            margin: 0,
            color: 'rgba(255,255,255,0.9)',
            fontSize: '13.5px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: '18px',
            marginBottom: '6px',
          }}
        >
          {result.title}
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '11px',
          }}
        >
          <span>{formatDate(result.lastModified)}</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>
            {result.path.split('/').slice(0, -1).join('/')}
          </span>
        </div>
      </div>

      {/* Tags bar */}
      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
        }}
      >
        {result.tags.map((tag) => (
          <span
            key={tag}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10.5px',
              fontWeight: 500,
              background: 'rgba(168, 140, 255, 0.08)',
              color: 'rgba(168, 140, 255, 0.6)',
            }}
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Content preview */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
        }}
      >
        {/* Simulated markdown content — Phase 1 will render real markdown */}
        <p
          style={{
            margin: '0 0 12px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12.5px',
            lineHeight: '20px',
            letterSpacing: '0.002em',
          }}
        >
          {result.snippet}
        </p>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '11.5px',
            lineHeight: '18px',
            fontStyle: 'italic',
          }}
        >
          Full preview available in Phase 1 when vault integration is connected.
        </div>
      </div>

      {/* Bottom action */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={() => window.launcher.openNote(result.path)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 14px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.55)',
            fontSize: '11.5px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M4.5 2L8.5 6L4.5 10"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Open in Obsidian
        </button>
      </div>
    </div>
  )
}
