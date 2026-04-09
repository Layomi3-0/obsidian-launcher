import type { QueuedMessage } from '@/lib/types'

interface QueueIndicatorProps {
  messages: QueuedMessage[]
  onRemove: (id: string) => void
}

const PREVIEW_MAX = 80

function preview(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= PREVIEW_MAX) return trimmed
  return trimmed.slice(0, PREVIEW_MAX) + '…'
}

export function QueueIndicator({ messages, onRemove }: QueueIndicatorProps) {
  return (
    <div
      className="no-drag"
      style={{
        padding: '6px 20px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div
        style={{
          fontSize: '10.5px',
          fontWeight: 500,
          color: 'rgba(168, 140, 255, 0.75)',
          fontFamily: "'SF Mono', Menlo, monospace",
          letterSpacing: '0.02em',
        }}
      >
        {messages.length} queued — will send after current response (Esc to clear)
      </div>
      {messages.map((msg) => (
        <QueuedRow key={msg.id} message={msg} onRemove={onRemove} />
      ))}
    </div>
  )
}

function QueuedRow({ message, onRemove }: { message: QueuedMessage; onRemove: (id: string) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.7)',
        lineHeight: '18px',
      }}
    >
      <span style={{ color: 'rgba(168,140,255,0.6)' }}>↳</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {preview(message.content) || '[image attachment]'}
      </span>
      <button
        type="button"
        onClick={() => onRemove(message.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.35)',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '0 4px',
        }}
        title="Remove from queue"
      >
        ×
      </button>
    </div>
  )
}
