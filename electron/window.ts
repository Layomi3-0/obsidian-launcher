import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null
let windowVisible = false

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
    resizable: false,
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
  mainWindow.setSize(680, 520)
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
  const x = Math.round((screenWidth - 680) / 2)
  mainWindow.setPosition(x, 180)
  mainWindow.show()
  mainWindow.focus()
  mainWindow.webContents.send('window:shown')
  windowVisible = true
}

export function hideWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('window:hidden')
  mainWindow.setIgnoreMouseEvents(true)
  mainWindow.setSize(1, 1)
  mainWindow.hide()
  windowVisible = false
}
