import { useRef, useEffect, useCallback } from 'react'

interface SearchInputProps {
  query: string
  mode: 'local' | 'ai' | 'idle' | 'history'
  onQueryChange: (query: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path
      d="M7.25 12.75C10.2876 12.75 12.75 10.2876 12.75 7.25C12.75 4.21243 10.2876 1.75 7.25 1.75C4.21243 1.75 1.75 4.21243 1.75 7.25C1.75 10.2876 4.21243 12.75 7.25 12.75Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.25 14.25L11.2625 11.2625"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const AiBadge = () => (
  <span
    className="animate-fade-in"
    style={{
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 7px',
      borderRadius: '5px',
      background: 'rgba(168, 140, 255, 0.1)',
      border: '1px solid rgba(168, 140, 255, 0.15)',
      color: 'rgba(168, 140, 255, 0.7)',
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.06em',
      fontFamily: "'SF Mono', Menlo, monospace",
      lineHeight: 1,
    }}
  >
    AI
  </span>
)

export function SearchInput({ query, mode, onQueryChange, onKeyDown }: SearchInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [query, resizeTextarea])

  useEffect(() => {
    if (!window.launcher?.onWindowShown) return
    return window.launcher.onWindowShown(() => {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    })
  }, [])

  const isAiMode = mode === 'ai'

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Shift+Enter for newlines only in AI mode
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
    }
    onKeyDown(e)
  }, [onKeyDown])

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 18px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        transition: 'border-color 0.2s ease',
        ...(isAiMode ? { borderBottomColor: 'rgba(168, 140, 255, 0.1)' } : {}),
      }}
    >
      {/* Search icon */}
      <div
        style={{
          color: isAiMode ? 'rgba(168, 140, 255, 0.5)' : 'rgba(255, 255, 255, 0.22)',
          transition: 'color 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '3px',
        }}
      >
        <SearchIcon />
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isAiMode ? "Ask anything..." : "Search notes, ask anything..."}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        rows={1}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'rgba(255, 250, 245, 0.85)',
          fontSize: '15px',
          fontWeight: 420,
          letterSpacing: '0.005em',
          lineHeight: '22px',
          caretColor: isAiMode ? '#a88cff' : 'rgba(255, 255, 255, 0.45)',
          fontFamily: "'Avenir Next', 'Avenir', -apple-system, sans-serif",
          resize: 'none',
          overflow: 'hidden',
          padding: 0,
          margin: 0,
        }}
      />

      {/* AI badge */}
      {isAiMode && (
        <div style={{ paddingTop: '2px' }}>
          <AiBadge />
        </div>
      )}
    </div>
  )
}
