import type { KanbanCard, KanbanProject } from '@/lib/types'

export interface TimeTheme {
  accent: string
  accentDim: string
  lineGradient: string
  label: string
}

export const TIME_THEME: Record<'morning' | 'afternoon' | 'evening', TimeTheme> = {
  morning: { accent: '#e8b86d', accentDim: 'rgba(232, 184, 109, 0.45)', lineGradient: 'rgba(232, 184, 109, 0.4)', label: 'MORNING' },
  afternoon: { accent: '#d4a574', accentDim: 'rgba(212, 165, 116, 0.45)', lineGradient: 'rgba(212, 165, 116, 0.35)', label: 'AFTERNOON' },
  evening: { accent: '#7b8fb5', accentDim: 'rgba(123, 143, 181, 0.45)', lineGradient: 'rgba(123, 143, 181, 0.4)', label: 'EVENING' },
}

export const MONO: React.CSSProperties = {
  fontFamily: "'SF Mono', Menlo, monospace",
  fontVariantNumeric: 'tabular-nums',
}

export const SECTION_LABEL: React.CSSProperties = {
  fontSize: '9.5px',
  fontWeight: 500,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255, 255, 255, 0.16)',
}

export const STATUS_ORDER = ['In Progress', 'Next', 'Inbox', 'Blocked', 'Review/Waiting']

export const STATUS_SHORT: Record<string, string> = {
  'In Progress': 'WIP',
  'Next': 'NXT',
  'Inbox': 'INB',
  'Blocked': 'BLK',
  'Review/Waiting': 'WAIT',
  'Done': 'DONE',
}

export const STATUS_COLOR: Record<string, string> = {
  'In Progress': '#60a5fa',
  'Next': '#a78bfa',
  'Inbox': 'rgba(255,255,255,0.25)',
  'Blocked': '#f87171',
  'Review/Waiting': '#fbbf24',
  'Done': '#4ade80',
}

export const PRIORITY_LABEL: Record<string, string> = {
  'P0 Today': 'P0',
  'P1 This week': 'P1',
  'P2 This month': 'P2',
  'P3 Sometime': 'P3',
}

export const ACTIONABLE_STATUSES = new Set(['In Progress', 'Next', 'Blocked', 'Review/Waiting'])

export function formatHeaderDate(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `${day} ${month} ${d.getDate()}`
}

export function relativeTime(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function projectColor(slug: string, projects: KanbanProject[]): string {
  const p = projects.find(pr => pr.slug === slug)
  return p?.color || 'rgba(255,255,255,0.2)'
}

export function buildBoardSummary(cards: KanbanCard[]) {
  const active = cards.filter(c => c.status !== 'Done')
  const counts: Record<string, number> = {}
  for (const c of active) {
    counts[c.status] = (counts[c.status] || 0) + 1
  }
  return { total: active.length, counts }
}

export function pickActionableItems(cards: KanbanCard[]): KanbanCard[] {
  const actionable = cards.filter(c => ACTIONABLE_STATUSES.has(c.status))

  const scored = actionable.map(card => {
    let score = 0
    if (card.priority === 'P0 Today') score += 100
    if (card.priority === 'P1 This week') score += 50
    if (card.priority === 'P2 This month') score += 20
    if (card.status === 'In Progress') score += 40
    if (card.status === 'Next') score += 25
    if (card.status === 'Blocked') score -= 30
    if (card.status === 'Review/Waiting') score -= 10
    return { card, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 5).map(s => s.card)
}
