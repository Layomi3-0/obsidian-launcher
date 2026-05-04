import { useRef, useEffect, useMemo, useState } from 'react'
import { marked } from 'marked'
import { hideWindow } from '@/lib/ipc'
import type { ChatMessage } from '@/hooks/useSearch'
import { CaptureButton } from './CaptureButton'
import { CopyButton } from './CopyButton'

interface AIResponseProps {
  messages: ChatMessage[]
  isStreaming: boolean
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

export function renderMarkdown(text: string): string {
  // Convert [[wikilinks]] to placeholder anchors before markdown parsing
  // Handles [[note]] and [[note|display text]] alias syntax
  const withLinks = text.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, note, alias) => {
      const display = alias || note
      return `<a class="wikilink" data-note="${escapeAttr(note)}">${display}</a>`
    },
  )

  const html = marked.parse(withLinks, { async: false, breaks: true }) as string
  return html
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
      pre.style.position = 'relative'
      const btn = document.createElement('button')
      btn.className = 'pre-copy-btn'
      btn.title = 'Copy code'
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code')
        navigator.clipboard.writeText(code?.textContent ?? pre.textContent ?? '')
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>`
        setTimeout(() => {
          btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`
        }, 1500)
      })
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

function CancellingIndicator() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      padding: '4px 0',
      marginTop: '2px',
      fontSize: '11px',
      color: 'rgba(248, 180, 100, 0.7)',
      fontFamily: "'SF Mono', Menlo, monospace",
    }}>
      <CancellingDots />
      cancelling
    </div>
  )
}

function CancellingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: '2px', width: '18px' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: 'rgba(248, 180, 100, 0.8)',
            animation: 'cancel-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes cancel-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </span>
  )
}

function AttachmentLabel({ count }: { count: number }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 7px',
      borderRadius: '5px',
      background: 'rgba(168, 140, 255, 0.15)',
      border: '1px solid rgba(168, 140, 255, 0.2)',
      fontSize: '10.5px',
      fontWeight: 500,
      color: 'rgba(168, 140, 255, 0.8)',
      lineHeight: 1,
      fontFamily: "'SF Mono', Menlo, monospace",
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      {count} image{count > 1 ? 's' : ''}
    </span>
  )
}

function UserBubble({ content, attachments }: { content: string; attachments?: import('@/lib/types').Attachment[] }) {
  const imageCount = attachments?.filter(a => a.mimeType.startsWith('image/')).length ?? 0
  const isPlaceholder = imageCount > 0 && /^\[\d+ images? attached\]$/.test(content)
  const showText = content && !isPlaceholder

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 20px' }}>
      <div
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          borderRadius: '12px 12px 4px 12px',
          background: 'rgba(168, 140, 255, 0.12)',
          border: '1px solid rgba(168, 140, 255, 0.1)',
          color: 'rgba(255,255,255,0.88)',
          fontSize: '13px',
          lineHeight: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: imageCount > 0 && showText ? '6px' : '0px',
        }}
      >
        {imageCount > 0 && <AttachmentLabel count={imageCount} />}
        {showText && <div>{content}</div>}
        {!showText && imageCount === 0 && <div>{content}</div>}
      </div>
    </div>
  )
}

function AssistantBubble({ content, isLast, isStreaming, interrupted }: { content: string; isLast: boolean; isStreaming: boolean; interrupted?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const showThinking = isLast && isStreaming && !content && !interrupted
  const isCancelling = isLast && isStreaming && interrupted
  const showInterruptedLabel = interrupted && !isStreaming
  const showCopy = hovered && content && !isStreaming

  return (
    <div
      style={{ padding: '4px 20px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ maxWidth: '95%' }}>
        {showThinking ? (
          <ThinkingDots />
        ) : isCancelling && !content ? (
          <CancellingIndicator />
        ) : (
          <MarkdownContent content={content} isStreaming={isStreaming && !interrupted} isLast={isLast} />
        )}
        {isCancelling && content && <CancellingIndicator />}
        {showInterruptedLabel && (
          <div style={{
            marginTop: '4px',
            fontSize: '11px',
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.35)',
            fontFamily: "'SF Mono', Menlo, monospace",
          }}>
            [interrupted]
          </div>
        )}
        {showCopy && (
          <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
            <CopyButton content={content} mode="text" />
          </div>
        )}
      </div>
    </div>
  )
}

export function AIResponse({ messages, isStreaming }: AIResponseProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Handle wikilink clicks via native DOM event delegation
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const wikilink = target.closest('a.wikilink') as HTMLElement | null
      if (wikilink) {
        e.preventDefault()
        e.stopPropagation()
        const note = wikilink.dataset.note
        if (note) {
          console.log('[wikilink] clicking:', note)
          window.launcher.openNote(note).then(
            (result: any) => {
              console.log('[wikilink] result:', JSON.stringify(result))
              hideWindow()
            },
            (err: any) => console.error('[wikilink] error:', err),
          )
        }
      }
    }

    container.addEventListener('click', handleClick, true)
    return () => container.removeEventListener('click', handleClick, true)
  }, [])

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, messages[messages.length - 1]?.content])

  const lastAssistantDone = !isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content

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
        paddingTop: '8px',
        paddingBottom: '6px',
        userSelect: 'text',
        cursor: 'text',
      }}
    >
      {messages.length === 0 && (
        <div style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.25)', fontSize: '12.5px', fontStyle: 'italic' }}>
          Type your message and press Enter...
        </div>
      )}

      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1
        if (msg.role === 'user') {
          return <UserBubble key={i} content={msg.content} attachments={msg.attachments} />
        }
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

      {/* Capture button after conversation settles */}
      {lastAssistantDone && <CaptureButton messages={messages} />}
    </div>
  )
}
