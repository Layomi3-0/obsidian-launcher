import { useState, useCallback, type ReactNode } from 'react'

type CopyMode = 'markdown' | 'text'

interface CopyButtonProps {
  content: string
  mode: CopyMode
}

const ICONS: Record<CopyMode, ReactNode> = {
  markdown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </svg>
  ),
  text: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  ),
}

const LABELS: Record<CopyMode, string> = {
  markdown: 'MD',
  text: 'Copy',
}

export function CopyButton({ content, mode }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const textToCopy = mode === 'text' ? stripMarkdown(content) : content
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [content, mode])

  return (
    <button
      onClick={handleCopy}
      title={mode === 'markdown' ? 'Copy as Markdown' : 'Copy as plain text'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '3px 7px',
        borderRadius: '5px',
        background: copied ? 'rgba(94, 200, 146, 0.12)' : 'rgba(255, 255, 255, 0.04)',
        border: `1px solid ${copied ? 'rgba(94, 200, 146, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
        color: copied ? 'rgba(94, 200, 146, 0.85)' : 'rgba(255, 255, 255, 0.4)',
        fontSize: '10.5px',
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: "'SF Mono', Menlo, monospace",
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
        }
      }}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      ) : (
        ICONS[mode]
      )}
      {copied ? '✓' : LABELS[mode]}
    </button>
  )
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`{3}[\s\S]*?`{3}/g, (m) => m.replace(/`{3}.*\n?/g, '').trim())
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*>\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
