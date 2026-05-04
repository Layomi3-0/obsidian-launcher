import { useRef, useEffect, useCallback } from 'react'

interface SearchInputProps {
  query: string
  isAiMode: boolean
  onQueryChange: (query: string) => void
  onSubmit: () => void
  onCancel?: () => void
  isStreaming?: boolean
  focusSignal?: number
  suppressEnterSubmit?: boolean
}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M7.25 12.75C10.2876 12.75 12.75 10.2876 12.75 7.25C12.75 4.21243 10.2876 1.75 7.25 1.75C4.21243 1.75 1.75 4.21243 1.75 7.25C1.75 10.2876 4.21243 12.75 7.25 12.75Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.25 14.25L11.2625 11.2625" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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

const StopButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title="Stop streaming (Esc)"
    style={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '22px',
      height: '22px',
      borderRadius: '5px',
      background: 'rgba(248, 180, 100, 0.12)',
      border: '0.5px solid rgba(248, 180, 100, 0.25)',
      cursor: 'pointer',
      color: 'rgba(248, 180, 100, 0.85)',
      padding: 0,
      transition: 'background 0.15s ease',
    }}
  >
    <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
      <rect x="1" y="1" width="8" height="8" rx="1.5" />
    </svg>
  </button>
)

export function SearchInput({ query, isAiMode, onQueryChange, onSubmit, onCancel, isStreaming, focusSignal, suppressEnterSubmit }: SearchInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    if (!el.value) {
      el.style.height = '22px'
      return
    }
    el.style.height = '22px'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  useEffect(() => attachAggressiveFocus(textareaRef), [])
  useEffect(() => { textareaRef.current?.focus() }, [focusSignal])
  useEffect(() => { resizeTextarea() }, [query, resizeTextarea])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && isStreaming) {
      e.preventDefault()
      onCancel?.()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (suppressEnterSubmit) return
      e.preventDefault()
      onSubmit()
    }
  }, [onSubmit, onCancel, isStreaming, suppressEnterSubmit])

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(28, 28, 32, 1)',
        transition: 'border-color 0.2s ease',
        ...(isAiMode ? { borderTopColor: 'rgba(168, 140, 255, 0.12)' } : {}),
      }}
    >
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

      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isAiMode ? 'Ask anything…' : 'Search vault, ask anything…'}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        rows={1}
        style={{
          flex: 1,
          minWidth: 0,
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
          wordBreak: 'break-word',
          padding: 0,
          margin: 0,
        }}
      />

      {isStreaming && onCancel && (
        <div style={{ paddingTop: '1px' }}>
          <StopButton onClick={onCancel} />
        </div>
      )}

      {isAiMode && (
        <div style={{ paddingTop: '2px' }}>
          <AiBadge />
        </div>
      )}
    </div>
  )
}

function attachAggressiveFocus(ref: React.RefObject<HTMLTextAreaElement | null>): () => void {
  const focus = () => {
    const el = ref.current
    if (!el) return
    try { window.focus() } catch { /* ignore */ }
    el.focus({ preventScroll: true })
  }
  focus()
  const raf = requestAnimationFrame(focus)
  const t1 = window.setTimeout(focus, 60)
  const t2 = window.setTimeout(focus, 220)
  const onVisibility = () => { if (document.visibilityState === 'visible') focus() }
  const onWindowFocus = () => focus()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', onWindowFocus)
  return () => {
    cancelAnimationFrame(raf)
    clearTimeout(t1); clearTimeout(t2)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onWindowFocus)
  }
}
