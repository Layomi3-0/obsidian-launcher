interface TransparencyControlProps {
  opacity: number
  showSlider: boolean
  onToggleSlider: () => void
  onOpacityChange: (value: number) => void
}

export function TransparencyControl({ opacity, showSlider, onToggleSlider, onOpacityChange }: TransparencyControlProps) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        onClick={onToggleSlider}
        title="Adjust transparency"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '1px 6px',
          borderRadius: '4px',
          background: showSlider ? 'rgba(255,255,255,0.06)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={(e) => { if (!showSlider) e.currentTarget.style.background = 'transparent' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="6" cy="6" r="2" fill="rgba(255,255,255,0.25)" />
        </svg>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
          {Math.round(opacity * 100)}%
        </span>
      </button>

      {showSlider && (
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(28, 28, 32, 0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>Clear</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            style={{ width: '100px', accentColor: '#a88cff' }}
          />
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>Solid</span>
        </div>
      )}
    </div>
  )
}
