import { useState, useEffect, useCallback } from 'react'
import { TransparencyControl } from './TransparencyControl'

interface StatusBarProps {
  mode: 'local' | 'ai' | 'idle' | 'history'
  resultCount: number
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '16px',
        height: '16px',
        padding: '0 4px',
        borderRadius: '3.5px',
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '10px',
        fontFamily: 'SF Mono, Menlo, monospace',
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      {children}
    </kbd>
  )
}

const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  gemini: { label: 'Gemini', color: 'rgba(108, 180, 238, 0.6)' },
  claude: { label: 'Claude', color: 'rgba(232, 160, 100, 0.6)' },
}

function loadOpacity(): number {
  try {
    const saved = localStorage.getItem('launcher-opacity')
    if (saved) return parseFloat(saved)
  } catch {}
  return 1
}

export function StatusBar({ mode, resultCount }: StatusBarProps) {
  const [provider, setProvider] = useState<string>('gemini')
  const [available, setAvailable] = useState<string[]>([])
  const [opacity, setOpacity] = useState(loadOpacity)
  const [showSlider, setShowSlider] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--glass-opacity', String(opacity))
    localStorage.setItem('launcher-opacity', String(opacity))
  }, [opacity])

  useEffect(() => {
    window.launcher?.getAIProvider?.().then((result) => {
      if (result) {
        setProvider(result.current)
        setAvailable(result.available)
      }
    })
  }, [])

  const cycleProvider = useCallback(() => {
    if (available.length < 2) return
    const currentIdx = available.indexOf(provider)
    const next = available[(currentIdx + 1) % available.length]
    window.launcher?.setAIProvider?.(next).then(() => setProvider(next))
  }, [provider, available])

  const modeLabel = mode === 'ai' ? 'AI' : mode === 'local' ? 'Search' : 'Ready'
  const modeColor =
    mode === 'ai'
      ? 'rgba(168, 140, 255, 0.55)'
      : mode === 'local'
        ? 'rgba(94, 200, 146, 0.55)'
        : 'rgba(255,255,255,0.2)'

  const providerInfo = PROVIDER_LABELS[provider] || { label: provider, color: 'rgba(255,255,255,0.3)' }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 18px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        minHeight: '30px',
      }}
    >
      {/* Left: mode indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: modeColor,
            transition: 'background 0.2s ease',
          }}
        />
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 500,
            color: modeColor,
            letterSpacing: '0.02em',
            transition: 'color 0.2s ease',
          }}
        >
          {modeLabel}
        </span>

        {mode === 'local' && resultCount > 0 && (
          <span
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.18)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Separator */}
        <span style={{ color: 'rgba(255,255,255,0.08)', margin: '0 2px' }}>|</span>

        {/* AI Provider toggle */}
        <button
          onClick={cycleProvider}
          title={available.length > 1 ? 'Click to switch AI provider' : 'Only one provider configured'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '1px 6px',
            borderRadius: '4px',
            background: available.length > 1 ? 'rgba(255,255,255,0.03)' : 'transparent',
            border: 'none',
            cursor: available.length > 1 ? 'pointer' : 'default',
            fontFamily: 'inherit',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (available.length > 1) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = available.length > 1 ? 'rgba(255,255,255,0.03)' : 'transparent'
          }}
        >
          <div
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: providerInfo.color,
            }}
          />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: providerInfo.color,
              letterSpacing: '0.02em',
            }}
          >
            {providerInfo.label}
          </span>
        </button>
      </div>

      {/* Center: transparency control */}
      <TransparencyControl
        opacity={opacity}
        showSlider={showSlider}
        onToggleSlider={() => setShowSlider(prev => !prev)}
        onOpacityChange={setOpacity}
      />

      {/* Right: keyboard hints */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', marginLeft: '2px' }}>
            navigate
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Kbd>↵</Kbd>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', marginLeft: '2px' }}>
            open
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Kbd>⎋</Kbd>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', marginLeft: '2px' }}>
            close
          </span>
        </div>
      </div>
    </div>
  )
}
