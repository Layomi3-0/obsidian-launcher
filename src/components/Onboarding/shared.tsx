import { useState, useEffect } from 'react'

export const MONO: React.CSSProperties = {
  fontFamily: "'SF Mono', Menlo, monospace",
  fontVariantNumeric: 'tabular-nums',
}

// ── Step Container (crossfade animation) ──

interface StepContainerProps {
  active: boolean
  direction: 'forward' | 'back'
  children: React.ReactNode
}

export function StepContainer({ active, direction, children }: StepContainerProps) {
  const [mounted, setMounted] = useState(active)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (active) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)))
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(timer)
    }
  }, [active])

  if (!mounted) return null

  const translateX = direction === 'forward' ? '16px' : '-16px'

  return (
    <div
      style={{
        position: active && animating ? 'relative' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        opacity: animating ? 1 : 0,
        transform: animating ? 'translateX(0)' : `translateX(${translateX})`,
        transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  )
}

// ── Progress Dots ──

export function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? '20px' : '6px',
            height: '6px',
            borderRadius: '3px',
            background: dotColor(i, current),
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      ))}
    </div>
  )
}

function dotColor(index: number, current: number): string {
  if (index === current) return 'rgba(168, 140, 255, 0.8)'
  if (index < current) return 'rgba(168, 140, 255, 0.3)'
  return 'rgba(255, 255, 255, 0.08)'
}

// ── Buttons ──

export function PrimaryButton({ children, onClick, disabled }: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 20px',
        borderRadius: '8px',
        border: 'none',
        background: disabled ? 'rgba(168, 140, 255, 0.15)' : 'rgba(168, 140, 255, 0.85)',
        color: disabled ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.95)',
        fontSize: '12.5px',
        fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(168, 140, 255, 0.95)' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = 'rgba(168, 140, 255, 0.85)' }}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'transparent',
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'
        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'
      }}
    >
      {children}
    </button>
  )
}

export function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: '17px',
      fontWeight: 600,
      color: 'rgba(255, 255, 255, 0.88)',
      margin: '0 0 8px',
      letterSpacing: '-0.015em',
    }}>
      {children}
    </h2>
  )
}

export function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" fill="none" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="rgba(168,140,255,0.8)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function truncatePath(path: string): string {
  const parts = path.split('/')
  if (parts.length <= 4) return path
  return '~/' + parts.slice(-3).join('/')
}
