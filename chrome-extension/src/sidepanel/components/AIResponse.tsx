import { useRef, useEffect, useMemo, useState } from 'react'
import { renderMarkdown } from '@/lib/markdown'
import type { ChatMessage } from '@/lib/types'

interface AIResponseProps {
  messages: ChatMessage[]
  isStreaming: boolean
  onWikilinkClick?: (note: string) => void
}

export function MarkdownContent({ content, isStreaming, isLast }: { content: string; isStreaming: boolean; isLast: boolean }) {
  const html = useMemo(() => renderMarkdown(content), [content])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const preBlocks = container.querySelectorAll('pre')
    preBlocks.forEach((pre) => {
      if (pre.querySelector('.pre-copy-btn')) return
      const btn = makeCopyButton(pre)
      pre.appendChild(btn)
    })
  }, [html])

  return (
    <div
      ref={containerRef}
      className={`markdown-body${isLast && isStreaming ? ' animate-typewriter-cursor' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function makeCopyButton(pre: HTMLElement): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'pre-copy-btn'
  btn.title = 'Copy code'
  btn.innerHTML = COPY_ICON
  btn.addEventListener('click', () => {
    const code = pre.querySelector('code')
    navigator.clipboard.writeText(code?.textContent ?? pre.textContent ?? '')
    btn.innerHTML = CHECK_ICON
    setTimeout(() => { btn.innerHTML = COPY_ICON }, 1500)
  })
  return btn
}

const COPY_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`
const CHECK_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>`

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse-dot"
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#a88cff',
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  )
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 7px',
        borderRadius: '5px',
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        color: 'rgba(255, 255, 255, 0.4)',
        fontFamily: "'SF Mono', Menlo, monospace",
        fontSize: '10px',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
      }}
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 14px' }}>
      <div
        style={{
          maxWidth: '88%',
          padding: '8px 12px',
          borderRadius: '12px 12px 4px 12px',
          background: 'rgba(168, 140, 255, 0.12)',
          border: '1px solid rgba(168, 140, 255, 0.1)',
          color: 'rgba(255, 255, 255, 0.88)',
          fontSize: '13px',
          lineHeight: '20px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {content}
      </div>
    </div>
  )
}

function AssistantBubble({ content, isLast, isStreaming, interrupted }: { content: string; isLast: boolean; isStreaming: boolean; interrupted?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const showThinking = isLast && isStreaming && !content
  const showInterrupted = interrupted && !isStreaming
  const showCopy = hovered && content && !isStreaming

  return (
    <div
      style={{ padding: '4px 14px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ maxWidth: '100%' }}>
        {showThinking ? (
          <ThinkingDots />
        ) : (
          <MarkdownContent content={content} isStreaming={isStreaming && !interrupted} isLast={isLast} />
        )}
        {showInterrupted && (
          <div
            style={{
              marginTop: '4px',
              fontSize: '10.5px',
              fontStyle: 'italic',
              color: 'rgba(255, 255, 255, 0.32)',
              fontFamily: "'SF Mono', Menlo, monospace",
            }}
          >
            [interrupted]
          </div>
        )}
        {showCopy && (
          <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
            <CopyButton content={content} />
          </div>
        )}
      </div>
    </div>
  )
}

export function AIResponse({ messages, isStreaming, onWikilinkClick }: AIResponseProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const wikilink = target.closest('a.wikilink') as HTMLElement | null
      if (!wikilink) return
      e.preventDefault()
      e.stopPropagation()
      const note = wikilink.dataset.note
      if (note) onWikilinkClick?.(note)
    }
    container.addEventListener('click', handleClick, true)
    return () => container.removeEventListener('click', handleClick, true)
  }, [onWikilinkClick])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, messages[messages.length - 1]?.content])

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        paddingTop: '10px',
        paddingBottom: '8px',
        userSelect: 'text',
        cursor: 'text',
      }}
    >
      {messages.length === 0 && (
        <div
          style={{
            padding: '14px 20px',
            color: 'rgba(255, 255, 255, 0.28)',
            fontSize: '12.5px',
            fontStyle: 'italic',
          }}
        >
          Ask about this page, your vault, or anything…
        </div>
      )}
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1
        if (msg.role === 'user') return <UserBubble key={i} content={msg.content} />
        return (
          <AssistantBubble
            key={i}
            content={msg.content}
            isLast={isLast}
            isStreaming={isStreaming}
            interrupted={msg.interrupted}
          />
        )
      })}
    </div>
  )
}
