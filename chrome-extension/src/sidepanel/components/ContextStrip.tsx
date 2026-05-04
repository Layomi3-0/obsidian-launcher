import type { MentionedTab } from '@/lib/types'

interface ContextStripProps {
  activeTitle?: string
  activeUrl?: string
  mentioned: MentionedTab[]
  onRemoveMention: (tabId: number) => void
}

export function ContextStrip({ activeTitle, activeUrl, mentioned, onRemoveMention }: ContextStripProps) {
  const showActive = isScriptableUrl(activeUrl)
  if (!showActive && mentioned.length === 0) return null

  return (
    <div className="qlx-context-strip animate-fade-in">
      {showActive && <Chip title={activeTitle || hostnameOf(activeUrl) || 'Active tab'} url={activeUrl} kind="active" />}
      {mentioned.map((m) => (
        <Chip
          key={m.tabId}
          title={m.title || hostnameOf(m.url) || 'Tab'}
          url={m.url}
          kind="mentioned"
          onRemove={() => onRemoveMention(m.tabId)}
        />
      ))}
    </div>
  )
}

interface ChipProps {
  title: string
  url?: string
  kind: 'active' | 'mentioned'
  onRemove?: () => void
}

function Chip({ title, url, kind, onRemove }: ChipProps) {
  return (
    <div className={`qlx-context-chip ${kind}`} title={url ?? ''}>
      <span className="qlx-context-chip-dot" />
      <span className="qlx-context-chip-text">{title}</span>
      {kind === 'mentioned' && onRemove && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onRemove}
          className="qlx-context-chip-remove"
          title="Remove from context"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" />
          </svg>
        </button>
      )}
    </div>
  )
}

function isScriptableUrl(url: string | undefined): boolean {
  if (!url) return false
  return !url.startsWith('chrome://') && !url.startsWith('chrome-extension://') && !url.startsWith('edge://') && !url.startsWith('about:')
}

function hostnameOf(url: string | undefined): string | null {
  if (!url) return null
  try { return new URL(url).hostname } catch { return null }
}
