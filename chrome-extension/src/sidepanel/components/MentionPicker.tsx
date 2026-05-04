import { useEffect, useMemo, useState } from 'react'
import type { MentionedTab } from '@/lib/types'

interface MentionPickerProps {
  filter: string
  excludeIds: number[]
  onSelect: (tab: MentionedTab) => void
  onClose: () => void
}

const MAX_RESULTS = 8

export function MentionPicker({ filter, excludeIds, onSelect, onClose }: MentionPickerProps) {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])
  const [highlight, setHighlight] = useState(0)

  useEffect(() => {
    chrome.tabs.query({}).then(setTabs).catch(() => setTabs([]))
  }, [])

  const filtered = useMemo(() => filterTabs(tabs, filter, excludeIds), [tabs, filter, excludeIds])

  useEffect(() => { setHighlight(0) }, [filter])

  useEffect(() => attachKeyboardNav(filtered, highlight, setHighlight, onSelect, onClose), [filtered, highlight, onSelect, onClose])

  return (
    <div className="qlx-mention-picker animate-fade-in" role="listbox">
      <div className="qlx-mention-header">Mention a tab</div>
      {filtered.length === 0 && <div className="qlx-mention-empty">No matching tabs</div>}
      {filtered.map((tab, i) => (
        <MentionItem
          key={tab.id}
          tab={tab}
          active={i === highlight}
          onPick={(picked) => onSelect(picked)}
          onHover={() => setHighlight(i)}
        />
      ))}
    </div>
  )
}

function MentionItem({ tab, active, onPick, onHover }: { tab: chrome.tabs.Tab; active: boolean; onPick: (t: MentionedTab) => void; onHover: () => void }) {
  const id = tab.id
  if (id === undefined) return null
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={onHover}
      onClick={() => onPick({ tabId: id, title: tab.title ?? '', url: tab.url ?? '' })}
      className={`qlx-mention-item${active ? ' active' : ''}`}
    >
      <span className="qlx-mention-title">{tab.title || 'Untitled'}</span>
      <span className="qlx-mention-url">{hostnameOf(tab.url) || tab.url}</span>
    </button>
  )
}

function filterTabs(tabs: chrome.tabs.Tab[], filter: string, excludeIds: number[]): chrome.tabs.Tab[] {
  const exclude = new Set(excludeIds)
  const lower = filter.toLowerCase()
  return tabs
    .filter((t) => t.id !== undefined && !exclude.has(t.id) && isMentionable(t.url))
    .filter((t) => !lower || (t.title?.toLowerCase().includes(lower) ?? false) || (t.url?.toLowerCase().includes(lower) ?? false))
    .slice(0, MAX_RESULTS)
}

function isMentionable(url: string | undefined): boolean {
  if (!url) return false
  return !url.startsWith('chrome://') && !url.startsWith('chrome-extension://') && !url.startsWith('edge://')
}

function attachKeyboardNav(
  filtered: chrome.tabs.Tab[],
  highlight: number,
  setHighlight: (fn: (h: number) => number) => void,
  onSelect: (tab: MentionedTab) => void,
  onClose: () => void,
): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const tab = filtered[highlight]
      if (tab?.id !== undefined) {
        e.preventDefault()
        e.stopPropagation()
        onSelect({ tabId: tab.id, title: tab.title ?? '', url: tab.url ?? '' })
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }
  document.addEventListener('keydown', onKey, true)
  return () => document.removeEventListener('keydown', onKey, true)
}

function hostnameOf(url: string | undefined): string | null {
  if (!url) return null
  try { return new URL(url).hostname } catch { return null }
}
