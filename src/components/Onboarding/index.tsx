import { useState, useCallback, useEffect, useRef } from 'react'
import type { AIProvider } from '@/lib/types'
import { StepContainer, ProgressDots } from './shared'
import { WelcomeStep } from './WelcomeStep'
import { VaultStep } from './VaultStep'
import { ApiKeyStep } from './ApiKeyStep'

interface OnboardingProps {
  onPickFolder: () => Promise<string | null>
  onValidateKey: (key: string, provider?: string) => Promise<{ valid: boolean; error?: string }>
  onComplete: (settings: { vaultPath: string; apiKey: string; provider: AIProvider }) => void
}

type Step = 'welcome' | 'vault' | 'apikey'

const STEPS: Step[] = ['welcome', 'vault', 'apikey']

export function Onboarding({ onPickFolder, onValidateKey, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [vaultPath, setVaultPath] = useState('')
  const [provider, setProvider] = useState<AIProvider>('claude')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [validating, setValidating] = useState(false)
  const [keyValid, setKeyValid] = useState<boolean | null>(null)
  const [keyError, setKeyError] = useState('')
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  useEffect(() => { if (step === 'apikey') setTimeout(() => inputRef.current?.focus(), 350) }, [step])

  const stepIndex = STEPS.indexOf(step)

  const goTo = useCallback((next: Step) => {
    setDirection(STEPS.indexOf(next) > STEPS.indexOf(step) ? 'forward' : 'back')
    setStep(next)
  }, [step])

  const handlePickFolder = useCallback(async () => {
    const path = await onPickFolder()
    if (path) setVaultPath(path)
  }, [onPickFolder])

  const handleValidateKey = useCallback(async () => {
    if (!apiKey.trim()) return
    setValidating(true)
    setKeyError('')
    setKeyValid(null)

    const result = await onValidateKey(apiKey.trim(), provider)
    setValidating(false)

    if (result.valid) {
      setKeyValid(true)
      setTimeout(() => onComplete({ vaultPath, apiKey: apiKey.trim(), provider }), 600)
    } else {
      setKeyValid(false)
      setKeyError(result.error || 'Invalid API key')
    }
  }, [apiKey, vaultPath, provider, onValidateKey, onComplete])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && step === 'apikey' && apiKey.trim() && !validating) handleValidateKey()
  }, [step, apiKey, validating, handleValidateKey])

  const resetKeyState = useCallback((p: AIProvider) => {
    setProvider(p)
    setApiKey('')
    setKeyValid(null)
    setKeyError('')
  }, [])

  return (
    <div
      className="no-drag"
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease',
      }}
    >
      <AmbientGlow intensity={stepIndex * 0.15 + 0.05} />
      <ProgressDots current={stepIndex} total={STEPS.length} />

      <div style={{ position: 'relative', width: '100%', maxWidth: '420px', padding: '0 40px' }}>
        <StepContainer active={step === 'welcome'} direction={direction}>
          <WelcomeStep onContinue={() => goTo('vault')} />
        </StepContainer>

        <StepContainer active={step === 'vault'} direction={direction}>
          <VaultStep path={vaultPath} onPick={handlePickFolder} onContinue={() => goTo('apikey')} onSkip={() => goTo('apikey')} />
        </StepContainer>

        <StepContainer active={step === 'apikey'} direction={direction}>
          <ApiKeyStep
            provider={provider} apiKey={apiKey} showKey={showKey}
            validating={validating} keyValid={keyValid} keyError={keyError} inputRef={inputRef}
            onChangeProvider={resetKeyState} onChangeKey={setApiKey}
            onToggleShow={() => setShowKey(p => !p)} onValidate={handleValidateKey}
            onKeyDown={handleKeyDown} onBack={() => goTo('vault')}
          />
        </StepContainer>
      </div>
    </div>
  )
}

function AmbientGlow({ intensity }: { intensity: number }) {
  return (
    <div style={{
      position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
      width: '500px', height: '500px', borderRadius: '50%',
      background: `radial-gradient(circle, rgba(168, 140, 255, ${intensity}) 0%, transparent 70%)`,
      filter: 'blur(80px)', transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)', pointerEvents: 'none',
    }} />
  )
}
