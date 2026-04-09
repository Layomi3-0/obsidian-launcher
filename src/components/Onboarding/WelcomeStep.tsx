import { MONO, PrimaryButton } from './shared'

export function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <AppIcon />

      <h1 style={{
        fontSize: '22px',
        fontWeight: 600,
        color: 'rgba(255, 255, 255, 0.92)',
        margin: '0 0 8px',
        letterSpacing: '-0.02em',
      }}>
        Brain Dump
      </h1>

      <p style={{
        fontSize: '13px',
        color: 'rgba(255, 255, 255, 0.35)',
        margin: '0 0 36px',
        lineHeight: '20px',
      }}>
        Search notes, capture ideas, summarize videos,
        <br />
        and dump anything interesting — all from one shortcut.
      </p>

      <PrimaryButton onClick={onContinue}>Get Started</PrimaryButton>

      <p style={{
        ...MONO,
        fontSize: '9.5px',
        color: 'rgba(255, 255, 255, 0.12)',
        marginTop: '20px',
        letterSpacing: '0.05em',
      }}>
        Takes about 30 seconds
      </p>
    </div>
  )
}

function AppIcon() {
  return (
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '14px',
      background: 'linear-gradient(135deg, rgba(168, 140, 255, 0.2) 0%, rgba(168, 140, 255, 0.08) 100%)',
      border: '1px solid rgba(168, 140, 255, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 24px',
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(168, 140, 255, 0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c-1.2 0-2.4.6-3 1.5A3.5 3.5 0 0 0 5.5 8c-1.2 0-2.3.7-2.8 1.7A3 3 0 0 0 3 12c0 1.7 1.3 3 3 3h12c1.7 0 3-1.3 3-3 0-.8-.3-1.5-.7-2.1A3 3 0 0 0 18.5 8 3.5 3.5 0 0 0 15 4.5c-.6-.9-1.8-1.5-3-1.5z" />
        <path d="M12 15v6" />
        <path d="M9.5 18.5l2.5-2 2.5 2" />
      </svg>
    </div>
  )
}
