import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null
let windowVisible = false
let lastPosition: { x: number; y: number } | null = null
let lastSize: { width: number; height: number } | null = null
let compact = false
let expandedHeight = 520
const FULL_WIDTH = 680
const COMPACT_HEIGHT = 54

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function isVisible(): boolean {
  return windowVisible
}

export function createWindow(): BrowserWindow {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize

  const windowWidth = 680
  const windowHeight = 520
  const x = Math.round((screenWidth - windowWidth) / 2)
  const y = 180

  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false,
    },
  })

  win.setMinimumSize(400, 200)
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  win.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault()
      hideWindow()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow = win
  return win
}

export function toggleWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (windowVisible) {
    hideWindow()
  } else {
    showWindow()
  }
}

export function showWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  mainWindow.setIgnoreMouseEvents(false)
  const width = lastSize?.width ?? FULL_WIDTH
  const height = lastSize?.height ?? expandedHeight
  mainWindow.setSize(width, height)

  if (lastPosition && isPositionVisible(lastPosition.x, lastPosition.y, width, height)) {
    mainWindow.setPosition(lastPosition.x, lastPosition.y)
  } else {
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
    mainWindow.setPosition(Math.round((screenWidth - FULL_WIDTH) / 2), 180)
  }
  mainWindow.show()
  mainWindow.focus()
  mainWindow.webContents.send('window:shown')
  windowVisible = true
}

export function hideWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const [x, y] = mainWindow.getPosition()
  const [w, h] = mainWindow.getSize()
  lastPosition = { x, y }
  lastSize = { width: w, height: h }
  mainWindow.webContents.send('window:hidden')
  mainWindow.setIgnoreMouseEvents(true)
  mainWindow.setSize(1, 1)
  mainWindow.hide()
  windowVisible = false
}

function isPositionVisible(x: number, y: number, width: number, height: number): boolean {
  const displays = screen.getAllDisplays()
  for (const display of displays) {
    const { x: dx, y: dy, width: dw, height: dh } = display.workArea
    const overlapX = Math.max(0, Math.min(x + width, dx + dw) - Math.max(x, dx))
    const overlapY = Math.max(0, Math.min(y + height, dy + dh) - Math.max(y, dy))
    if (overlapX > 50 && overlapY > 30) return true
  }
  return false
}

export function setCompact(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const [w, h] = mainWindow.getSize()
  expandedHeight = h
  compact = true
  lastSize = { width: w, height: COMPACT_HEIGHT }
  mainWindow.setMinimumSize(300, COMPACT_HEIGHT)
  mainWindow.setSize(w, COMPACT_HEIGHT)
  mainWindow.webContents.send('window:compact', true)
}

export function setExpanded(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  compact = false
  const [w] = mainWindow.getSize()
  lastSize = { width: w, height: expandedHeight }
  mainWindow.setMinimumSize(400, 200)
  mainWindow.setSize(w, expandedHeight)
  mainWindow.webContents.send('window:compact', false)
}
