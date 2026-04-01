import { useRef, useEffect, useMemo } from 'react'
import { marked } from 'marked'
import { hideWindow } from '@/lib/ipc'
import type { ChatMessage } from '@/hooks/useSearch'
import { CaptureButton } from './CaptureButton'

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

  return (
    <div
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

function UserBubble({ content }: { content: string }) {
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
        }}
      >
        {content}
      </div>
    </div>
  )
}

function AssistantBubble({ content, isLast, isStreaming }: { content: string; isLast: boolean; isStreaming: boolean }) {
  const showThinking = isLast && isStreaming && !content

  return (
    <div style={{ padding: '4px 20px' }}>
      <div style={{ maxWidth: '95%' }}>
        {showThinking ? (
          <ThinkingDots />
        ) : (
          <MarkdownContent content={content} isStreaming={isStreaming} isLast={isLast} />
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
          return <UserBubble key={i} content={msg.content} />
        }
        return (
          <AssistantBubble
            key={i}
            content={msg.content}
            isLast={isLast}
            isStreaming={isStreaming}
          />
        )
      })}

      {/* Capture button after conversation settles */}
      {lastAssistantDone && <CaptureButton messages={messages} />}
    </div>
  )
}
