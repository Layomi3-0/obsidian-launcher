import { useState } from 'react'
import type { ChatMessage } from '@/hooks/useSearch'

export function CaptureButton({ messages }: { messages: ChatMessage[] }) {
  const [captured, setCaptured] = useState<string | null>(null)

  const handleCapture = async () => {
    const date = new Date().toISOString().split('T')[0]
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '')
    const suggestedPath = `Captures/${date}-chat-${time}.md`

    const chatContent = messages
      .map(m => m.role === 'user' ? `**You:** ${m.content}` : `**Launcher:** ${m.content}`)
      .join('\n\n')

    const content = `---\ncaptured: ${new Date().toISOString()}\nsource: brain-dump\ntype: chat\n---\n\n${chatContent}`

    const result = await window.launcher?.captureNote(content, suggestedPath)
    if (result?.success && result.path) {
      setCaptured(result.path)
    }
  }

  return (
    <div style={{ padding: '8px 20px 4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
      {!captured ? (
        <button
          onClick={handleCapture}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '7px',
            background: 'rgba(168, 140, 255, 0.08)',
            border: '1px solid rgba(168, 140, 255, 0.12)',
            color: 'rgba(168, 140, 255, 0.7)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(168, 140, 255, 0.14)'
            e.currentTarget.style.color = '#a88cff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(168, 140, 255, 0.08)'
            e.currentTarget.style.color = 'rgba(168, 140, 255, 0.7)'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 2.5V10.5M2.5 6.5H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Capture to vault
        </button>
      ) : (
        <button
          onClick={() => window.launcher?.openNote(captured)}
          className="animate-fade-in"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '7px',
            background: 'rgba(94, 200, 146, 0.08)',
            border: '1px solid rgba(94, 200, 146, 0.15)',
            color: 'rgba(94, 200, 146, 0.75)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(94, 200, 146, 0.14)'
            e.currentTarget.style.color = 'rgba(94, 200, 146, 0.95)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(94, 200, 146, 0.08)'
            e.currentTarget.style.color = 'rgba(94, 200, 146, 0.75)'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2.5 6.5L5.5 9.5L10.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Open in Obsidian
        </button>
      )}
    </div>
  )
}
