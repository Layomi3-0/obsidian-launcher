import { ipcMain, shell, BrowserWindow } from 'electron'
import { execFile, execSync } from 'child_process'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, writeFileSync, appendFileSync } from 'fs'
import { SearchService } from './services/search'
import { MemoryService } from './services/memory'
import { AIService } from './services/ai'
import { ObsidianCLI } from './services/obsidian-cli'
import { loadConfig } from './config'
import { hideWindow, setCompact, setExpanded } from './window'
import { registerConfigHandlers } from './ipc-config'
import { handleAIQuery, cancelRequest, getCurrentSessionId, setCurrentSessionId, resetSessionId, getLastNoteOpened, setLastNoteOpened, isFirstInvocationToday } from './ai-handler'

interface Services {
  mainWindow: BrowserWindow
  getSearchService: () => SearchService
  getMemoryService: () => MemoryService
  getAIService: () => AIService
  getObsidianCLI: () => ObsidianCLI
}

export function registerIpcHandlers(services: Services): void {
  const { mainWindow, getSearchService, getMemoryService, getAIService, getObsidianCLI } = services
  registerWindowHandlers()
  registerSearchHandlers(getSearchService, getMemoryService)
  registerNoteHandlers(getObsidianCLI, getMemoryService)
  registerAIHandlers(mainWindow, getAIService, getMemoryService)
  registerConversationHandlers(getMemoryService)
  registerCommandHandlers(getMemoryService)
  registerObsidianHandlers(getObsidianCLI)
  registerKanbanHandler()
  registerConfigHandlers(mainWindow)

  ipcMain.handle('open:url', async (_event, url: string) => {
    await shell.openExternal(url)
  })
}

function registerWindowHandlers(): void {
  ipcMain.on('window:hide', () => hideWindow())
  ipcMain.on('window:compact', () => setCompact())
  ipcMain.on('window:expand', () => setExpanded())
}

function registerSearchHandlers(getSearchService: () => SearchService, getMemoryService: () => MemoryService): void {
  ipcMain.handle('search:query', async (_event, query: string) => {
    const frecencyScores = getMemoryService().getFrecencyScores()
    return getSearchService().search(query, 10, frecencyScores, getLastNoteOpened())
  })
}

function registerNoteHandlers(getObsidianCLI: () => ObsidianCLI, getMemoryService: () => MemoryService): void {
  ipcMain.handle('note:open', async (_event, path: string) => {
    const opened = await openNoteInObsidian(path, getObsidianCLI())
    execFile('open', ['-a', 'Obsidian'])
    setLastNoteOpened(path)
    getMemoryService().logNoteAccess(path)
    return { opened }
  })

  ipcMain.handle('session:context', async () => {
    const hour = new Date().getHours()
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    const recent = getMemoryService().getRecentInteractions(5)

    return {
      sessionId: getCurrentSessionId(),
      recentQueries: recent.map(i => ({ query: i.query, timestamp: i.timestamp })),
      lastNoteOpened: getLastNoteOpened(),
      clipboardPreview: null,
      timeOfDay,
      isFirstInvocationToday: isFirstInvocationToday(),
    }
  })

  ipcMain.handle('capture:note', async (_event, content: string, suggestedPath: string) => {
    return captureNote(getObsidianCLI(), content, suggestedPath)
  })
}

async function openNoteInObsidian(path: string, obsidianCLI: ObsidianCLI): Promise<boolean> {
  const noteName = path.replace(/\.md$/, '').split('/').pop() || path
  let opened = await obsidianCLI.openNote(noteName)

  if (!opened && path.includes('/')) {
    opened = await obsidianCLI.openNotePath(path)
  }

  if (!opened) {
    const config = loadConfig()
    const vaultName = config.vaultPath.split('/').pop() || 'vault'
    const uri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(path)}`
    await shell.openExternal(uri)
  }

  return opened
}

async function captureNote(obsidianCLI: ObsidianCLI, content: string, suggestedPath: string) {
  const name = suggestedPath.replace(/\.md$/, '').split('/').pop() || suggestedPath
  const folder = suggestedPath.includes('/') ? suggestedPath.slice(0, suggestedPath.lastIndexOf('/') + 1) : undefined

  const created = await obsidianCLI.createNote(name, content, folder)
  if (created) return { success: true, path: suggestedPath }

  const config = loadConfig()
  if (!config.vaultPath) return { success: false, error: 'No vault configured' }

  const fullPath = join(config.vaultPath, suggestedPath)
  const dir = join(fullPath, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
  return { success: true, path: suggestedPath }
}

function registerAIHandlers(mainWindow: BrowserWindow, getAIService: () => AIService, getMemoryService: () => MemoryService): void {
  ipcMain.on('ai:query', (_event, requestId: string, query: string, attachments?: { id: string; name: string; mimeType: string; base64: string; size: number }[]) => {
    handleAIQuery(requestId, query, mainWindow, getAIService(), getMemoryService(), attachments ?? []).catch((err) => {
      console.error('[ai:query] Unhandled error:', err)
      mainWindow?.webContents.send('ai:chunk', {
        requestId,
        chunk: `Error: ${err instanceof Error ? err.message : String(err)}`,
        done: false,
      })
      mainWindow?.webContents.send('ai:chunk', { requestId, chunk: '', done: true, interrupted: false })
    })
  })

  ipcMain.on('ai:cancel', (_event, requestId: string) => cancelRequest(requestId))

  ipcMain.handle('ai:provider:get', async () => ({
    current: getAIService().getProvider(),
    available: getAIService().getAvailableProviders(),
  }))

  ipcMain.handle('ai:provider:set', async (_event, provider: string) => {
    if (provider === 'gemini' || provider === 'claude') {
      getAIService().setProvider(provider)
      return { success: true, provider }
    }
    return { success: false, error: 'Invalid provider' }
  })
}

function registerConversationHandlers(getMemoryService: () => MemoryService): void {
  ipcMain.handle('conversation:list', async () => getMemoryService().getRecentConversations(20))
  ipcMain.handle('conversation:load', async (_event, id: string) => {
    setCurrentSessionId(id)
    return getMemoryService().getConversationMessages(id)
  })
  ipcMain.handle('conversation:new', async () => resetSessionId())
  ipcMain.handle('conversation:delete', async (_event, id: string) => {
    getMemoryService().deleteConversation(id)
    return { success: true }
  })
}

function registerCommandHandlers(getMemoryService: () => MemoryService): void {
  ipcMain.handle('command:forget', async (_event, target: string) => {
    if (target === 'last') {
      getMemoryService().deleteLastInteraction()
      return { success: true, message: 'Last interaction forgotten.' }
    }
    const count = getMemoryService().deleteInteractionsByTopic(target)
    return { success: true, message: `Forgot ${count} interactions about "${target}".` }
  })

  ipcMain.handle('command:feedback', async (_event, feedback: string) => {
    return saveFeedback(feedback)
  })
}

function saveFeedback(feedback: string) {
  const dir = join(homedir(), '.quick-launcher', 'memory')
  const prefsPath = join(dir, 'PREFERENCES.md')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  if (!existsSync(prefsPath)) {
    writeFileSync(prefsPath, '# User Preferences\n\nThese preferences are loaded into every AI prompt. Added via /feedback.\n', 'utf-8')
  }

  const timestamp = new Date().toISOString().split('T')[0]
  appendFileSync(prefsPath, `\n- [${timestamp}] ${feedback}`, 'utf-8')
  return { success: true }
}

function registerObsidianHandlers(getObsidianCLI: () => ObsidianCLI): void {
  ipcMain.handle('obsidian:search', async (_event, query: string) => getObsidianCLI().search(query))
  ipcMain.handle('obsidian:daily', async () => getObsidianCLI().dailyRead())
  ipcMain.handle('obsidian:daily:append', async (_event, content: string) => getObsidianCLI().dailyAppend(content))
  ipcMain.handle('obsidian:tags', async () => getObsidianCLI().listTags())
  ipcMain.handle('obsidian:backlinks', async (_event, name: string) => getObsidianCLI().getBacklinks(name))
  ipcMain.handle('obsidian:read', async (_event, name: string) => getObsidianCLI().readNote(name))
  ipcMain.handle('obsidian:move', async (_event, file: string, to: string) => getObsidianCLI().moveNote(file, to))
  ipcMain.handle('obsidian:properties', async (_event, name: string) => getObsidianCLI().getProperties(name))
}

function registerKanbanHandler(): void {
  ipcMain.handle('kanban:summary', async () => {
    const config = loadConfig()
    if (!config.kanbanEnabled || !config.kanbanPath) return { cards: [], projects: [] }

    try {
      const cards = fetchKanbanCards(config.kanbanPath)
      const projects = fetchKanbanProjects(config.kanbanPath)
      return { cards, projects }
    } catch (err) {
      console.error('[kanban] Failed to fetch summary:', err)
      return { cards: [], projects: [] }
    }
  })
}

function fetchKanbanCards(kanbanPath: string) {
  const raw = execSync('npm run kanban -- list --json', { cwd: kanbanPath, encoding: 'utf-8', timeout: 10000 })
  const jsonStart = raw.indexOf('[')
  if (jsonStart === -1) return []
  return JSON.parse(raw.slice(jsonStart))
}

function fetchKanbanProjects(kanbanPath: string) {
  const raw = execSync('npm run kanban -- projects', { cwd: kanbanPath, encoding: 'utf-8', timeout: 10000 })
  return raw
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('-'))
    .map(line => {
      const parts = line.trim().split(/\s{2,}/)
      return { slug: parts[0], name: parts[1], color: parts[2] || null }
    })
    .filter(p => p.slug && p.name)
}
