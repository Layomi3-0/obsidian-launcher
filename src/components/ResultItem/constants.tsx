import type { SearchResult } from '@/lib/types'

export const MATCH_TYPE_CONFIG = {
  fuzzy: { color: '#6cb4ee', label: 'fuzzy', icon: '~' },
  fulltext: { color: '#5ec892', label: 'exact', icon: '=' },
  semantic: { color: '#a88cff', label: 'semantic', icon: '~' },
} as const

export const TAG_COLORS: Record<string, string> = {
  project: 'rgba(94, 200, 146, 0.12)',
  engineering: 'rgba(108, 180, 238, 0.12)',
  active: 'rgba(255, 193, 94, 0.12)',
  'distributed-systems': 'rgba(168, 140, 255, 0.12)',
  algorithms: 'rgba(238, 108, 180, 0.12)',
  api: 'rgba(108, 220, 238, 0.12)',
  design: 'rgba(180, 140, 255, 0.12)',
  performance: 'rgba(255, 160, 94, 0.12)',
  wedding: 'rgba(255, 140, 168, 0.12)',
  personal: 'rgba(200, 180, 140, 0.12)',
  books: 'rgba(140, 168, 200, 0.12)',
  reference: 'rgba(168, 200, 140, 0.12)',
  spiritual: 'rgba(200, 168, 255, 0.12)',
  reflection: 'rgba(168, 200, 255, 0.12)',
  journal: 'rgba(255, 200, 168, 0.12)',
}

export const TAG_TEXT_COLORS: Record<string, string> = {
  project: 'rgba(94, 200, 146, 0.7)',
  engineering: 'rgba(108, 180, 238, 0.7)',
  active: 'rgba(255, 193, 94, 0.7)',
  'distributed-systems': 'rgba(168, 140, 255, 0.7)',
  algorithms: 'rgba(238, 108, 180, 0.7)',
  api: 'rgba(108, 220, 238, 0.7)',
  design: 'rgba(180, 140, 255, 0.7)',
  performance: 'rgba(255, 160, 94, 0.7)',
  wedding: 'rgba(255, 140, 168, 0.7)',
  personal: 'rgba(200, 180, 140, 0.7)',
  books: 'rgba(140, 168, 200, 0.7)',
  reference: 'rgba(168, 200, 140, 0.7)',
  spiritual: 'rgba(200, 168, 255, 0.7)',
  reflection: 'rgba(168, 200, 255, 0.7)',
  journal: 'rgba(255, 200, 168, 0.7)',
}

export function NoteIcon({ matchType }: { matchType: SearchResult['matchType'] }) {
  const config = MATCH_TYPE_CONFIG[matchType]
  return (
    <div
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '7px',
        background: `${config.color}10`,
        border: `1px solid ${config.color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect
          x="2.5"
          y="1.5"
          width="9"
          height="11"
          rx="1.5"
          stroke={config.color}
          strokeWidth="1"
          opacity="0.7"
        />
        <line x1="5" y1="5" x2="9" y2="5" stroke={config.color} strokeWidth="0.8" opacity="0.5" />
        <line x1="5" y1="7.5" x2="8" y2="7.5" stroke={config.color} strokeWidth="0.8" opacity="0.35" />
      </svg>
    </div>
  )
}
