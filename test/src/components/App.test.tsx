import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { App } from '@/App'

vi.mock('@/lib/ipc', () => ({
  search: vi.fn().mockResolvedValue([]),
  sendAIQuery: vi.fn(),
  onStreamChunk: vi.fn().mockReturnValue(() => {}),
  onWindowShown: vi.fn().mockReturnValue(() => {}),
  onWindowHidden: vi.fn().mockReturnValue(() => {}),
  getConversations: vi.fn().mockResolvedValue([]),
  loadConversation: vi.fn().mockResolvedValue([]),
  newConversation: vi.fn().mockResolvedValue('new-session'),
  openNote: vi.fn().mockResolvedValue(undefined),
  hideWindow: vi.fn(),
  getSessionContext: vi.fn().mockResolvedValue({
    sessionId: 'test',
    recentQueries: [],
    lastNoteOpened: null,
    clipboardPreview: null,
    timeOfDay: 'morning',
    isFirstInvocationToday: false,
  }),
  getKanbanSummary: vi.fn().mockResolvedValue({ cards: [], projects: [] }),
  openUrl: vi.fn(),
}))

vi.mock('marked', () => ({
  marked: { parse: (s: string) => s },
}))

beforeEach(() => {
  const store: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val },
    removeItem: (key: string) => { delete store[key] },
  })

  Object.defineProperty(window, 'launcher', {
    value: {
      getAIProvider: vi.fn().mockResolvedValue({ current: 'gemini', available: ['gemini'] }),
      setAIProvider: vi.fn(),
      onWindowShown: vi.fn().mockReturnValue(() => {}),
      onWindowHidden: vi.fn().mockReturnValue(() => {}),
    },
    writable: true,
    configurable: true,
  })
})

describe('App', () => {
  it('content container has no-drag class for scrolling', () => {
    const { container } = render(<App />)

    const launcherWindow = container.querySelector('.launcher-window')
    expect(launcherWindow).toBeTruthy()

    const noDragContent = launcherWindow!.querySelector('.no-drag')
    expect(noDragContent).toBeTruthy()

    const style = noDragContent!.getAttribute('style')
    expect(style).toContain('flex: 1')
    expect(style).toContain('display: flex')
  })
})
