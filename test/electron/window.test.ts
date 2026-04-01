// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockWebContents = { send: vi.fn() }

const mockWindow = {
  isDestroyed: vi.fn(() => false),
  show: vi.fn(),
  hide: vi.fn(),
  blur: vi.fn(),
  focus: vi.fn(),
  getSize: vi.fn(() => [680, 520]),
  setSize: vi.fn(),
  setPosition: vi.fn(),
  setIgnoreMouseEvents: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  loadFile: vi.fn(),
  webContents: mockWebContents,
}

function MockBrowserWindow() { return mockWindow }

vi.mock('electron', () => ({
  app: { getAppPath: () => '/mock/app', isQuitting: false },
  BrowserWindow: MockBrowserWindow,
  screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920 } }) },
}))

type WindowModule = typeof import('../../electron/window')

async function freshModule(): Promise<WindowModule> {
  vi.resetModules()
  return import('../../electron/window')
}

beforeEach(() => {
  vi.clearAllMocks()
  mockWindow.isDestroyed.mockReturnValue(false)
  mockWindow.getSize.mockReturnValue([680, 520])
})

describe('hideWindow', () => {
  it('shrinks window to 1x1 to prevent click interception', async () => {
    const { createWindow, hideWindow } = await freshModule()
    createWindow()
    hideWindow()

    expect(mockWindow.setSize).toHaveBeenCalledWith(1, 1)
  })

  it('hides the window and ignores mouse events', async () => {
    const { createWindow, hideWindow } = await freshModule()
    createWindow()
    hideWindow()

    expect(mockWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(true)
    expect(mockWindow.hide).toHaveBeenCalled()
  })

  it('sends window:hidden event', async () => {
    const { createWindow, hideWindow } = await freshModule()
    createWindow()
    hideWindow()

    expect(mockWebContents.send).toHaveBeenCalledWith('window:hidden')
  })

  it('sets visibility to false', async () => {
    const { createWindow, showWindow, hideWindow, isVisible } = await freshModule()
    createWindow()
    showWindow()
    expect(isVisible()).toBe(true)

    hideWindow()
    expect(isVisible()).toBe(false)
  })

  it('is a no-op when window is destroyed', async () => {
    const { createWindow, hideWindow } = await freshModule()
    createWindow()
    mockWindow.isDestroyed.mockReturnValue(true)
    hideWindow()

    expect(mockWindow.setSize).not.toHaveBeenCalled()
  })

  it('is a no-op when no window exists', async () => {
    const { hideWindow } = await freshModule()
    hideWindow()

    expect(mockWindow.setSize).not.toHaveBeenCalled()
  })
})

describe('showWindow', () => {
  it('restores window to full size before positioning', async () => {
    const { createWindow, showWindow } = await freshModule()
    createWindow()
    showWindow()

    expect(mockWindow.setSize).toHaveBeenCalledWith(680, 520)

    const sizeOrder = mockWindow.setSize.mock.invocationCallOrder[0]
    const posOrder = mockWindow.setPosition.mock.invocationCallOrder[0]
    expect(sizeOrder).toBeLessThan(posOrder)
  })

  it('centers window on screen', async () => {
    const { createWindow, showWindow } = await freshModule()
    createWindow()
    showWindow()

    // (1920 - 680) / 2 = 620
    expect(mockWindow.setPosition).toHaveBeenCalledWith(620, 180)
  })

  it('shows and focuses', async () => {
    const { createWindow, showWindow } = await freshModule()
    createWindow()
    showWindow()

    expect(mockWindow.show).toHaveBeenCalled()
    expect(mockWindow.focus).toHaveBeenCalled()
  })

  it('sends window:shown event', async () => {
    const { createWindow, showWindow } = await freshModule()
    createWindow()
    showWindow()

    expect(mockWebContents.send).toHaveBeenCalledWith('window:shown')
  })

  it('sets visibility to true', async () => {
    const { createWindow, showWindow, isVisible } = await freshModule()
    createWindow()
    expect(isVisible()).toBe(false)

    showWindow()
    expect(isVisible()).toBe(true)
  })
})

describe('hide → show round-trip', () => {
  it('shrinks to 1x1 on hide, restores to 680x520 on show', async () => {
    const { createWindow, showWindow, hideWindow } = await freshModule()
    createWindow()

    showWindow()
    expect(mockWindow.setSize).toHaveBeenLastCalledWith(680, 520)

    hideWindow()
    expect(mockWindow.setSize).toHaveBeenLastCalledWith(1, 1)

    vi.clearAllMocks()

    showWindow()
    expect(mockWindow.setSize).toHaveBeenCalledWith(680, 520)
    expect(mockWindow.setPosition).toHaveBeenCalledWith(620, 180)
    expect(mockWindow.show).toHaveBeenCalled()
    expect(mockWindow.focus).toHaveBeenCalled()
  })

  it('handles rapid cycles', async () => {
    const { createWindow, showWindow, hideWindow, isVisible } = await freshModule()
    createWindow()

    showWindow()
    hideWindow()
    showWindow()
    hideWindow()

    expect(isVisible()).toBe(false)
    expect(mockWindow.setSize).toHaveBeenLastCalledWith(1, 1)
  })
})

describe('toggleWindow', () => {
  it('hides when visible', async () => {
    const { createWindow, showWindow, toggleWindow, isVisible } = await freshModule()
    createWindow()
    showWindow()
    vi.clearAllMocks()

    toggleWindow()

    expect(isVisible()).toBe(false)
    expect(mockWindow.setSize).toHaveBeenCalledWith(1, 1)
    expect(mockWindow.hide).toHaveBeenCalled()
  })

  it('shows when hidden', async () => {
    const { createWindow, toggleWindow, isVisible } = await freshModule()
    createWindow()

    toggleWindow()

    expect(isVisible()).toBe(true)
    expect(mockWindow.setSize).toHaveBeenCalledWith(680, 520)
    expect(mockWindow.show).toHaveBeenCalled()
  })
})
