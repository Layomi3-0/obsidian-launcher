import type { SearchResult } from '@/lib/types'
import { ResultItem } from './ResultItem'

interface ResultsListProps {
  results: SearchResult[]
  selectedIndex: number
  query: string
  onSelectIndex: (index: number) => void
  onExecuteResult: (result: SearchResult) => void
}

export function ResultsList({
  results,
  selectedIndex,
  query,
  onSelectIndex,
  onExecuteResult,
}: ResultsListProps) {
  if (results.length === 0) return null

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '6px 0',
      }}
    >
      {/* Results count indicator */}
      <div
        style={{
          padding: '0 22px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.22)',
          }}
        >
          Notes
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.04)',
            padding: '1px 5px',
            borderRadius: '4px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {results.length}
        </span>
        <div
          style={{
            flex: 1,
            height: '1px',
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.04), transparent)',
          }}
        />
      </div>

      {/* Results */}
      {results.map((result, index) => (
        <ResultItem
          key={result.path}
          result={result}
          isSelected={index === selectedIndex}
          query={query}
          onSelect={() => onSelectIndex(index)}
          onClick={() => onExecuteResult(result)}
        />
      ))}
    </div>
  )
}
