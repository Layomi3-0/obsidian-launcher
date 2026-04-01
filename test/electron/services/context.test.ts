// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock(import('fs'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
  }
})

import { writeFileSync } from 'fs'
import { ContextService } from '../../../electron/services/context'

const mockWriteFileSync = vi.mocked(writeFileSync)

function createMockVault(notes: any[] = []) {
  return {
    getAllNotes: vi.fn().mockReturnValue(notes),
    on: vi.fn(),
    emit: vi.fn(),
  }
}

function createMockMemory() {
  return {
    getRecentInteractions: vi.fn().mockReturnValue([]),
    getFrecencyScores: vi.fn().mockReturnValue(new Map()),
  }
}

describe('ContextService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('start() calls rebuild', () => {
    const vault = createMockVault()
    const memory = createMockMemory()
    const svc = new ContextService(vault as any, memory as any)

    const rebuildSpy = vi.spyOn(svc, 'rebuild')
    svc.start()

    expect(rebuildSpy).toHaveBeenCalledOnce()
  })

  it('start() registers vault event listeners', () => {
    const vault = createMockVault()
    const memory = createMockMemory()
    const svc = new ContextService(vault as any, memory as any)
    svc.start()

    expect(vault.on).toHaveBeenCalledWith('note:added', expect.any(Function))
    expect(vault.on).toHaveBeenCalledWith('note:changed', expect.any(Function))
    expect(vault.on).toHaveBeenCalledWith('note:removed', expect.any(Function))
  })

  it('rebuild() writes CONTEXT.md to the correct path', async () => {
    const vault = createMockVault([
      { path: 'notes/a.md', title: 'A', content: 'content', tags: [], headings: [], links: [] },
    ])
    const memory = createMockMemory()
    const svc = new ContextService(vault as any, memory as any)

    svc.rebuild()
    await vi.runAllTimersAsync()
    await svc.ready

    expect(mockWriteFileSync).toHaveBeenCalledOnce()
    const writtenPath = (mockWriteFileSync.mock.calls[0] as any)[0] as string
    expect(writtenPath).toContain('CONTEXT.md')
    expect(writtenPath).toContain('.quick-launcher')
  })

  it('rebuild() writes content with vault overview', async () => {
    const vault = createMockVault([
      { path: 'Projects/alpha.md', title: 'Alpha', content: '- [ ] Do thing', tags: [], headings: [], links: [] },
    ])
    const memory = createMockMemory()
    const svc = new ContextService(vault as any, memory as any)

    svc.rebuild()
    await vi.runAllTimersAsync()
    await svc.ready

    const writtenContent = (mockWriteFileSync.mock.calls[0] as any)[1] as string
    expect(writtenContent).toContain('Auto-Generated Context')
    expect(writtenContent).toContain('Vault Structure')
  })

  it('ready promise resolves after rebuild completes', async () => {
    const vault = createMockVault()
    const memory = createMockMemory()
    const svc = new ContextService(vault as any, memory as any)

    svc.rebuild()
    await vi.runAllTimersAsync()

    await expect(svc.ready).resolves.toBeUndefined()
  })

  it('ready promise resolves even when generateContext throws', async () => {
    const vault = createMockVault()
    vault.getAllNotes.mockImplementation(() => { throw new Error('vault error') })
    const memory = createMockMemory()
    const svc = new ContextService(vault as any, memory as any)

    svc.rebuild()
    await vi.runAllTimersAsync()

    await expect(svc.ready).resolves.toBeUndefined()
  })

  it('includes project notes section when Projects/ folder exists', async () => {
    const vault = createMockVault([
      { path: 'Projects/nara.md', title: 'Nara', content: 'content', tags: [], headings: [], links: [] },
    ])
    const memory = createMockMemory()
    const svc = new ContextService(vault as any, memory as any)

    svc.rebuild()
    await vi.runAllTimersAsync()
    await svc.ready

    const content = (mockWriteFileSync.mock.calls[0] as any)[1] as string
    expect(content).toContain('Projects')
    expect(content).toContain('Nara')
  })

  it('includes open loops from unchecked tasks', async () => {
    const vault = createMockVault([
      {
        path: 'todos.md',
        title: 'Todos',
        content: '- [ ] Buy groceries\n- [x] Done task\n- [ ] Call dentist',
        tags: [],
        headings: [],
        links: [],
      },
    ])
    const memory = createMockMemory()
    const svc = new ContextService(vault as any, memory as any)

    svc.rebuild()
    await vi.runAllTimersAsync()
    await svc.ready

    const content = (mockWriteFileSync.mock.calls[0] as any)[1] as string
    expect(content).toContain('Open Loops')
    expect(content).toContain('Buy groceries')
    expect(content).toContain('Call dentist')
  })

  it('includes recent activity when interactions exist', async () => {
    const vault = createMockVault()
    const memory = createMockMemory()
    memory.getRecentInteractions.mockReturnValue([
      { query: '> what is the meaning of life', ai_response: '42' },
    ])
    const svc = new ContextService(vault as any, memory as any)

    svc.rebuild()
    await vi.runAllTimersAsync()
    await svc.ready

    const content = (mockWriteFileSync.mock.calls[0] as any)[1] as string
    expect(content).toContain('Recent Queries')
    expect(content).toContain('what is the meaning of life')
  })

  it('includes frequently accessed notes when frecency data exists', async () => {
    const vault = createMockVault()
    const memory = createMockMemory()
    memory.getFrecencyScores.mockReturnValue(new Map([['notes/fav.md', 8.5]]))
    const svc = new ContextService(vault as any, memory as any)

    svc.rebuild()
    await vi.runAllTimersAsync()
    await svc.ready

    const content = (mockWriteFileSync.mock.calls[0] as any)[1] as string
    expect(content).toContain('Frequently Accessed')
    expect(content).toContain('notes/fav.md')
  })
})
