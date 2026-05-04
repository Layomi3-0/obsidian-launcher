import { useRef, useEffect, useCallback } from 'react'
import type { Attachment } from '@/lib/types'

function isSupportedAttachment(file: { type: string }): boolean {
  return file.type.startsWith('image/') || file.type === 'application/pdf'
}

interface SearchInputProps {
  query: string
  mode: 'local' | 'ai' | 'idle' | 'history'
  onQueryChange: (query: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  isCompact?: boolean
  onToggleCompact?: () => void
  attachments?: Attachment[]
  onAddAttachments?: (files: Attachment[]) => void
  onRemoveAttachment?: (id: string) => void
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

const CompactToggle = ({ isCompact, onClick }: { isCompact: boolean; onClick: () => void }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={isCompact ? 'Expand (⌘M)' : 'Minimize (⌘M)'}
    style={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '22px',
      height: '22px',
      borderRadius: '5px',
      background: 'rgba(255, 255, 255, 0.04)',
      border: '0.5px solid rgba(255, 255, 255, 0.06)',
      cursor: 'pointer',
      color: 'rgba(255, 255, 255, 0.3)',
      padding: 0,
      transition: 'background 0.15s ease, color 0.15s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'
    }}
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      {isCompact ? (
        <>
          <path d="M3 1.5V4.5H1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 10.5V7.5H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <path d="M2.5 6H9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      )}
    </svg>
  </button>
)

function AttachButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title="Attach file (images, PDFs)"
      className="attach-button"
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        borderRadius: '5px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '0.5px solid rgba(255, 255, 255, 0.06)',
        cursor: 'pointer',
        color: 'rgba(255, 255, 255, 0.3)',
        padding: 0,
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(168, 140, 255, 0.12)'
        e.currentTarget.style.color = 'rgba(168, 140, 255, 0.7)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
      </svg>
    </button>
  )
}

function AttachmentStrip({ attachments, onRemove }: { attachments: Attachment[]; onRemove: (id: string) => void }) {
  if (attachments.length === 0) return null

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        gap: '6px',
        padding: '0 18px 8px',
        paddingLeft: '44px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {attachments.map((att) => (
        <AttachmentChip key={att.id} attachment={att} onRemove={() => onRemove(att.id)} />
      ))}
    </div>
  )
}

function AttachmentChip({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  const isImage = attachment.mimeType.startsWith('image/')
  const label = attachment.name.length > 20
    ? attachment.name.slice(0, 17) + '...'
    : attachment.name
  const sizeLabel = attachment.size < 1024 * 1024
    ? `${Math.round(attachment.size / 1024)}KB`
    : `${(attachment.size / (1024 * 1024)).toFixed(1)}MB`

  return (
    <div
      className="attachment-thumb"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 6px 3px 7px',
        borderRadius: '6px',
        background: 'rgba(168, 140, 255, 0.08)',
        border: '1px solid rgba(168, 140, 255, 0.15)',
        flexShrink: 0,
        transition: 'border-color 0.15s ease, background 0.15s ease',
        cursor: 'default',
      }}
    >
      {/* Icon */}
      {isImage ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(168, 140, 255, 0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(168, 140, 255, 0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}

      {/* Name + size */}
      <span style={{
        fontSize: '11px',
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.6)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        fontFamily: "'SF Mono', Menlo, monospace",
        letterSpacing: '0.01em',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '9px',
        color: 'rgba(255, 255, 255, 0.3)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}>
        {sizeLabel}
      </span>

      {/* Remove button */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRemove}
        className="attachment-remove-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.3)',
          cursor: 'pointer',
          padding: 0,
          transition: 'color 0.12s ease, background 0.12s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" />
        </svg>
      </button>
    </div>
  )
}

function readFileAsAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      resolve({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        mimeType: file.type,
        base64,
        size: file.size,
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function SearchInput({
  query, mode, onQueryChange, onKeyDown, isCompact, onToggleCompact,
  attachments = [], onAddAttachments, onRemoveAttachment,
}: SearchInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      resizeTextarea()
    })
  }, [resizeTextarea])

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const accepted = Array.from(files).filter(isSupportedAttachment)
    if (accepted.length === 0) return

    const parsed = await Promise.all(accepted.map(readFileAsAttachment))
    onAddAttachments?.(parsed)
  }, [onAddAttachments])

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const acceptedItems = Array.from(items).filter(isSupportedAttachment)
    if (acceptedItems.length === 0) return

    e.preventDefault()
    const files = acceptedItems.map(item => item.getAsFile()).filter(Boolean) as File[]
    await processFiles(files)
  }, [processFiles])

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    await processFiles(files)
    e.target.value = ''
  }, [processFiles])

  const isAiMode = mode === 'ai'
  const hasAttachments = attachments.length > 0

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
      e.preventDefault()
      onToggleCompact?.()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
    }
    onKeyDown(e)
  }, [onKeyDown, onToggleCompact])

  return (
    <div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '12px 18px',
          paddingBottom: hasAttachments ? '6px' : '12px',
          borderBottom: isCompact && !hasAttachments ? 'none' : (hasAttachments ? 'none' : '1px solid rgba(255, 255, 255, 0.05)'),
          transition: 'border-color 0.2s ease',
          ...((isAiMode || hasAttachments) && !isCompact ? { borderBottomColor: 'rgba(168, 140, 255, 0.1)' } : {}),
        }}
      >
        {/* Search icon */}
        <div
          style={{
            color: (isAiMode || hasAttachments) ? 'rgba(168, 140, 255, 0.5)' : 'rgba(255, 255, 255, 0.22)',
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
          onPaste={handlePaste}
          placeholder={hasAttachments ? "Add a message or just send..." : (isAiMode ? "Ask anything..." : "Search notes, ask anything...")}
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
            caretColor: (isAiMode || hasAttachments) ? '#a88cff' : 'rgba(255, 255, 255, 0.45)',
            fontFamily: "'Avenir Next', 'Avenir', -apple-system, sans-serif",
            resize: 'none',
            overflow: 'hidden',
            wordBreak: 'break-all',
            overflowWrap: 'break-word',
            padding: 0,
            margin: 0,
          }}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Attach button */}
        <div style={{ paddingTop: '1px' }}>
          <AttachButton onClick={handleFileSelect} />
        </div>

        {/* AI badge */}
        {(isAiMode || hasAttachments) && (
          <div style={{ paddingTop: '2px' }}>
            <AiBadge />
          </div>
        )}

        {/* Compact toggle */}
        {onToggleCompact && (
          <div style={{ paddingTop: '1px' }}>
            <CompactToggle isCompact={!!isCompact} onClick={onToggleCompact} />
          </div>
        )}
      </div>

      {/* Attachment thumbnails strip */}
      {hasAttachments && (
        <div style={{ borderBottom: isCompact ? 'none' : '1px solid rgba(168, 140, 255, 0.1)' }}>
          <AttachmentStrip attachments={attachments} onRemove={onRemoveAttachment ?? (() => {})} />
        </div>
      )}
    </div>
  )
}
