import type { AIProvider } from '@/lib/types'
import { MONO, StepLabel, PrimaryButton, GhostButton, Spinner } from './shared'

interface ApiKeyStepProps {
  provider: AIProvider
  apiKey: string
  showKey: boolean
  validating: boolean
  keyValid: boolean | null
  keyError: string
  inputRef: React.RefObject<HTMLInputElement | null>
  onChangeProvider: (p: AIProvider) => void
  onChangeKey: (key: string) => void
  onToggleShow: () => void
  onValidate: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onBack: () => void
}

export function ApiKeyStep({
  provider, apiKey, showKey, validating, keyValid, keyError,
  inputRef, onChangeProvider, onChangeKey, onToggleShow, onValidate, onKeyDown, onBack,
}: ApiKeyStepProps) {
  const isClaude = provider === 'claude'

  return (
    <div>
      <StepLabel>API Key</StepLabel>
      <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.3)', margin: '0 0 16px', lineHeight: '20px' }}>
        Choose your AI provider and enter your API key.
      </p>

      <ProviderToggle provider={provider} onChangeProvider={onChangeProvider} />
      <KeyInput
        inputRef={inputRef}
        apiKey={apiKey}
        showKey={showKey}
        keyValid={keyValid}
        placeholder={isClaude ? 'sk-ant-...' : 'AIzaSy...'}
        onChangeKey={onChangeKey}
        onToggleShow={onToggleShow}
        onKeyDown={onKeyDown}
      />
      <ValidationStatus keyError={keyError} keyValid={keyValid} />
      <GetKeyLink isClaude={isClaude} />

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <GhostButton onClick={onBack}>Back</GhostButton>
        <PrimaryButton onClick={onValidate} disabled={!apiKey.trim() || validating || keyValid === true}>
          {validating ? <ValidatingLabel /> : keyValid ? 'Done' : 'Validate & Finish'}
        </PrimaryButton>
      </div>
    </div>
  )
}

function ProviderToggle({ provider, onChangeProvider }: { provider: AIProvider; onChangeProvider: (p: AIProvider) => void }) {
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
      {(['claude', 'gemini'] as const).map(p => (
        <button
          key={p}
          onClick={() => onChangeProvider(p)}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: `1px solid ${provider === p ? 'rgba(168, 140, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)'}`,
            background: provider === p ? 'rgba(168, 140, 255, 0.1)' : 'transparent',
            color: provider === p ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.25)',
            fontSize: '11.5px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {p === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)'}
        </button>
      ))}
    </div>
  )
}

function KeyInput({ inputRef, apiKey, showKey, keyValid, placeholder, onChangeKey, onToggleShow, onKeyDown }: {
  inputRef: React.RefObject<HTMLInputElement | null>
  apiKey: string
  showKey: boolean
  keyValid: boolean | null
  placeholder: string
  onChangeKey: (key: string) => void
  onToggleShow: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  return (
    <div style={{ position: 'relative', marginBottom: '10px' }}>
      <input
        ref={inputRef}
        type={showKey ? 'text' : 'password'}
        value={apiKey}
        onChange={e => onChangeKey(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        style={{
          width: '100%',
          padding: '12px 80px 12px 14px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${borderColor(keyValid)}`,
          borderRadius: '10px',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '13px',
          fontFamily: "'SF Mono', Menlo, monospace",
          letterSpacing: showKey ? '0' : '0.1em',
          transition: 'border-color 0.2s ease',
          boxSizing: 'border-box',
        }}
        onFocus={e => { if (keyValid === null) e.currentTarget.style.borderColor = 'rgba(168, 140, 255, 0.3)' }}
        onBlur={e => { if (keyValid === null) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)' }}
      />
      <ShowHideToggle showKey={showKey} onToggle={onToggleShow} />
    </div>
  )
}

function borderColor(keyValid: boolean | null): string {
  if (keyValid === false) return 'rgba(248, 113, 113, 0.3)'
  if (keyValid === true) return 'rgba(74, 222, 128, 0.3)'
  return 'rgba(255, 255, 255, 0.06)'
}

function ShowHideToggle({ showKey, onToggle }: { showKey: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px',
        color: 'rgba(255, 255, 255, 0.2)', fontSize: '10px', ...MONO, transition: 'color 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.2)' }}
    >
      {showKey ? 'HIDE' : 'SHOW'}
    </button>
  )
}

function ValidationStatus({ keyError, keyValid }: { keyError: string; keyValid: boolean | null }) {
  if (keyError) {
    return <div style={{ fontSize: '11px', color: 'rgba(248, 113, 113, 0.8)', marginBottom: '10px', padding: '0 2px' }}>{keyError}</div>
  }

  if (keyValid) {
    return (
      <div style={{ fontSize: '11px', color: 'rgba(74, 222, 128, 0.8)', marginBottom: '10px', padding: '0 2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Connected — launching...
      </div>
    )
  }

  return null
}

function GetKeyLink({ isClaude }: { isClaude: boolean }) {
  const url = isClaude ? 'https://console.anthropic.com/settings/keys' : 'https://aistudio.google.com/apikey'
  const label = isClaude ? 'Get a Claude API key' : 'Get a free Gemini API key'

  return (
    <div style={{ marginBottom: '20px' }}>
      <span
        onClick={() => window.launcher?.openUrl(url)}
        style={{ fontSize: '11.5px', color: 'rgba(168, 140, 255, 0.5)', cursor: 'pointer', transition: 'color 0.15s ease' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(168, 140, 255, 0.8)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(168, 140, 255, 0.5)' }}
      >
        {label}
        <span style={{ marginLeft: '4px', fontSize: '10px' }}>&nearr;</span>
      </span>
    </div>
  )
}

function ValidatingLabel() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Spinner />
      Validating...
    </span>
  )
}
