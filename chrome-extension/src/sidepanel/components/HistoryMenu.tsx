import { useEffect, useRef, useState } from 'react'
import { bridge } from '@/lib/bridge'
import type { Conversation } from '@/lib/types'

interface HistoryMenuProps {
  onSelect: (id: string) => void
  onClose: () => void
}

export function HistoryMenu({ onSelect, onClose }: HistoryMenuProps) {
  const [items, setItems] = useState<Conversation[] | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bridge.rpc<Conversation[]>('listConversations').then(setItems).catch(() => setItems([]))
  }, [])

  useEffect(() => attachOutsideClose(ref, onClose), [onClose])

  return (
    <div ref={ref} className="qlx-history-menu animate-fade-in">
      <div className="qlx-history-header">Recent chats</div>
      {items === null && <div className="qlx-history-empty">Loading…</div>}
      {items && items.length === 0 && <div className="qlx-history-empty">No saved chats yet</div>}
      {items?.map((c) => (
        <button key={c.id} className="qlx-history-item" onClick={() => onSelect(c.id)}>
          <span className="qlx-history-title">{c.title || 'Untitled chat'}</span>
          <span className="qlx-history-meta">{c.message_count} msg · {timeAgo(c.updated_at)}</span>
        </button>
      ))}
    </div>
  )
}

function attachOutsideClose(ref: React.RefObject<HTMLElement | null>, onClose: () => void): () => void {
  const onMouseDown = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) onClose()
  }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  document.addEventListener('mousedown', onMouseDown)
  document.addEventListener('keydown', onKey)
  return () => {
    document.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('keydown', onKey)
  }
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
