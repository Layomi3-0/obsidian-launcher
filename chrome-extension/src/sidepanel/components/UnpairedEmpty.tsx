interface UnpairedEmptyProps {
  reason?: string
}

export function UnpairedEmpty({ reason }: UnpairedEmptyProps) {
  return (
    <div className="qlx-empty">
      <div className="qlx-empty-title">Pair with Brain Dump</div>
      <div className="qlx-empty-hint">
        {reason ?? 'Open Brain Dump and copy the token from ~/.brain-dump/extension-token, then paste it in settings.'}
      </div>
      <button className="qlx-button" onClick={() => chrome.runtime.openOptionsPage()}>
        Open settings
      </button>
      <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.32)' }}>
        Default shortcut: <kbd>⌘⇧O</kbd>
      </div>
    </div>
  )
}
