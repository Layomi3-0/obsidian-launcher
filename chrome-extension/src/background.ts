/// <reference types="chrome" />

const PORT_PREFIX = 'sidepanel:'
const portsByWindow = new Map<number, chrome.runtime.Port>()

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[bg] setPanelBehavior failed:', err))

chrome.runtime.onConnect.addListener((port) => {
  if (!port.name.startsWith(PORT_PREFIX)) return
  const windowId = parseInt(port.name.slice(PORT_PREFIX.length), 10)
  if (Number.isNaN(windowId)) return
  portsByWindow.set(windowId, port)
  port.onDisconnect.addListener(() => {
    if (portsByWindow.get(windowId) === port) portsByWindow.delete(windowId)
  })
})

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== 'open-launcher') return
  const windowId = tab?.windowId
  if (windowId === undefined || windowId < 0) return

  const openPort = portsByWindow.get(windowId)
  if (openPort) {
    try { openPort.postMessage({ type: 'close' }) } catch (err) {
      console.warn('[bg] failed to message sidepanel:', err)
    }
    return
  }
  // Must call synchronously inside the listener to preserve user gesture.
  chrome.sidePanel.open({ windowId }).catch((err) => {
    console.error('[bg] sidePanel.open failed:', err)
  })
})

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.runtime.openOptionsPage()
  }
})
