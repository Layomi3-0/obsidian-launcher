import { useEffect, useState } from 'react'
import { Bridge } from '@/lib/bridge'
import { loadEndpoint, loadToken, saveEndpoint, saveToken, clearToken } from '@/lib/storage'

type TestState = 'idle' | 'testing' | 'ok' | 'err'

export function OptionsApp() {
  const [token, setToken] = useState('')
  const [endpoint, setEndpoint] = useState('ws://127.0.0.1:51789')
  const [testState, setTestState] = useState<TestState>('idle')
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [savedToken, setSavedToken] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([loadToken(), loadEndpoint()]).then(([t, e]) => {
      setSavedToken(t)
      setToken(t ?? '')
      setEndpoint(e)
    })
  }, [])

  const handleTest = async () => {
    if (!token.trim()) {
      setTestState('err')
      setTestMessage('Enter a token first.')
      return
    }
    setTestState('testing')
    setTestMessage(null)
    const result = await testConnection(endpoint.trim(), token.trim())
    setTestState(result.ok ? 'ok' : 'err')
    setTestMessage(result.message)
  }

  const handleSave = async () => {
    await Promise.all([saveToken(token.trim()), saveEndpoint(endpoint.trim())])
    setSavedToken(token.trim())
    setTestMessage('Saved. Open the side panel with ⌘⇧O.')
    setTestState('ok')
  }

  const handleClear = async () => {
    await clearToken()
    setToken('')
    setSavedToken(null)
    setTestState('idle')
    setTestMessage('Token cleared.')
  }

  return (
    <div className="qlx-options">
      <div className="qlx-options-eyebrow">Brain Dump</div>
      <h1 className="qlx-options-title">Pair with the desktop app</h1>
      <p className="qlx-options-subtitle">
        The side panel talks to Brain Dump over a localhost WebSocket. Paste the token below and test the connection.
      </p>

      <div className="qlx-options-section">
        <label className="qlx-options-label" htmlFor="qlx-token">Token</label>
        <input
          id="qlx-token"
          type="password"
          className="qlx-options-input"
          value={token}
          placeholder="64-character hex string"
          onChange={(e) => { setToken(e.target.value); setTestState('idle'); setTestMessage(null) }}
          spellCheck={false}
          autoComplete="off"
        />
        <div className="qlx-options-help">
          Find it at <code>~/.brain-dump/extension-token</code>. Run <code>cat ~/.brain-dump/extension-token</code> in your terminal and paste the value.
        </div>

        <label className="qlx-options-label" style={{ marginTop: 18 }} htmlFor="qlx-endpoint">Endpoint</label>
        <input
          id="qlx-endpoint"
          type="text"
          className="qlx-options-input"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />

        <div className="qlx-options-row">
          <button className="qlx-button" onClick={handleTest} disabled={testState === 'testing'}>
            {testState === 'testing' ? 'Testing…' : 'Test connection'}
          </button>
          <button className="qlx-button" onClick={handleSave}>Save</button>
          {savedToken && (
            <button className="qlx-button" onClick={handleClear} style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              Clear
            </button>
          )}
          <StatusBadge state={testState} message={testMessage} />
        </div>
      </div>

      <div className="qlx-options-section">
        <label className="qlx-options-label">Keyboard shortcut</label>
        <div className="qlx-options-help">
          Default is <code>⌘⇧O</code> on macOS / <code>Ctrl+Shift+L</code> elsewhere. Rebind at <code>chrome://extensions/shortcuts</code>.
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ state, message }: { state: TestState; message: string | null }) {
  if (state === 'idle') return null
  const cls = state === 'ok' ? 'ok' : state === 'err' ? 'err' : 'warn'
  const label = state === 'testing' ? 'Testing' : state === 'ok' ? 'Connected' : 'Failed'
  return (
    <span className={`qlx-options-status ${cls}`}>
      <span className={`qlx-status-dot ${state === 'ok' ? 'connected' : state === 'testing' ? 'connecting' : 'error'}`} />
      {label}{message ? ` — ${message}` : ''}
    </span>
  )
}

function testConnection(endpoint: string, token: string): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const probe = new Bridge()
    const timeout = window.setTimeout(() => {
      probe.disconnect()
      resolve({ ok: false, message: 'Timeout — is Brain Dump running?' })
    }, 4000)
    probe.connect(endpoint, token).then(
      () => {
        clearTimeout(timeout)
        probe.disconnect()
        resolve({ ok: true, message: 'Token accepted.' })
      },
      (err: Error) => {
        clearTimeout(timeout)
        probe.disconnect()
        resolve({ ok: false, message: err.message || 'Failed' })
      },
    )
  })
}
