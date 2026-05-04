const PORT_PREFIX = 'sidepanel:'
const RECONNECT_DELAY_MS = 200

export function attachSidepanelLifecycle(): () => void {
  let mounted = true
  let port: chrome.runtime.Port | null = null

  const connect = async () => {
    if (!mounted) return
    const win = await chrome.windows.getCurrent().catch(() => null)
    if (!mounted || !win || typeof win.id !== 'number') return
    port = chrome.runtime.connect({ name: `${PORT_PREFIX}${win.id}` })
    port.onMessage.addListener(handleMessage)
    port.onDisconnect.addListener(() => {
      if (mounted) setTimeout(() => void connect(), RECONNECT_DELAY_MS)
    })
  }

  void connect()
  return () => {
    mounted = false
    try { port?.disconnect() } catch { /* ignore */ }
  }
}

function handleMessage(msg: unknown): void {
  if (isCloseMessage(msg)) window.close()
}

function isCloseMessage(msg: unknown): boolean {
  return typeof msg === 'object' && msg !== null && (msg as { type?: string }).type === 'close'
}
