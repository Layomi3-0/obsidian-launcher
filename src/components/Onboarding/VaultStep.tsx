import { MONO, StepLabel, PrimaryButton, GhostButton, truncatePath } from './shared'

interface VaultStepProps {
  path: string
  onPick: () => void
  onContinue: () => void
  onSkip: () => void
}

export function VaultStep({ path, onPick, onContinue, onSkip }: VaultStepProps) {
  const hasPath = path.length > 0

  return (
    <div>
      <StepLabel>Connect Your Vault</StepLabel>
      <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.3)', margin: '0 0 24px', lineHeight: '20px' }}>
        Point to your Obsidian vault so we can search and understand your notes.
      </p>

      <VaultPicker path={path} hasPath={hasPath} onPick={onPick} />

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <GhostButton onClick={onSkip}>Skip — no vault</GhostButton>
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  )
}

function VaultPicker({ path, hasPath, onPick }: { path: string; hasPath: boolean; onPick: () => void }) {
  const displayPath = hasPath ? truncatePath(path) : null

  return (
    <div
      onClick={onPick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        background: hasPath ? 'rgba(168, 140, 255, 0.04)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${hasPath ? 'rgba(168, 140, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '16px',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = hasPath ? 'rgba(168, 140, 255, 0.06)' : 'rgba(255, 255, 255, 0.04)'
        e.currentTarget.style.borderColor = hasPath ? 'rgba(168, 140, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = hasPath ? 'rgba(168, 140, 255, 0.04)' : 'rgba(255, 255, 255, 0.02)'
        e.currentTarget.style.borderColor = hasPath ? 'rgba(168, 140, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)'
      }}
    >
      <FolderIcon hasPath={hasPath} />
      <PathDisplay displayPath={displayPath} hasPath={hasPath} />
      <BrowseLabel />
    </div>
  )
}

function FolderIcon({ hasPath }: { hasPath: boolean }) {
  return (
    <div style={{
      width: '32px', height: '32px', borderRadius: '8px',
      background: hasPath ? 'rgba(168, 140, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      transition: 'background 0.2s ease',
    }}>
      {hasPath ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(168, 140, 255, 0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      )}
    </div>
  )
}

function PathDisplay({ displayPath, hasPath }: { displayPath: string | null; hasPath: boolean }) {
  if (!hasPath) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.25)' }}>
          Choose your vault folder...
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ ...MONO, fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {displayPath}
      </div>
      <div style={{ ...MONO, fontSize: '9px', color: 'rgba(168, 140, 255, 0.5)', marginTop: '2px' }}>
        Click to change
      </div>
    </div>
  )
}

function BrowseLabel() {
  return (
    <div style={{ ...MONO, fontSize: '10px', color: 'rgba(255, 255, 255, 0.15)', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '5px', flexShrink: 0 }}>
      Browse
    </div>
  )
}
