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
import { hideWindow } from './window'
import { handleAIQuery, getCurrentSessionId, setCurrentSessionId, resetSessionId, getLastNoteOpened, setLastNoteOpened, isFirstInvocationToday } from './ai-handler'

interface Services {
  mainWindow: BrowserWindow
  searchService: SearchService
  memoryService: MemoryService
  aiService: AIService
  obsidianCLI: ObsidianCLI
}

export function registerIpcHandlers({
  mainWindow,
  searchService,
  memoryService,
  aiService,
  obsidianCLI,
}: Services): void {
  ipcMain.on('window:hide', () => hideWindow())

  ipcMain.handle('search:query', async (_event, query: string) => {
    const frecencyScores = memoryService.getFrecencyScores()
    return searchService.search(query, 10, frecencyScores, getLastNoteOpened())
  })

  ipcMain.handle('note:open', async (_event, path: string) => {
    console.log('[note:open] Received path:', path)
    const log: string[] = [`path: ${path}`]

    // Try CLI open by name first
    const noteName = path.replace(/\.md$/, '').split('/').pop() || path
    log.push(`trying CLI open file="${noteName}"`)
    let opened = await obsidianCLI.openNote(noteName)
    log.push(`CLI openNote: ${opened}`)

    // Try CLI with full path if name didn't work
    if (!opened && path.includes('/')) {
      log.push(`trying CLI open path="${path}"`)
      opened = await obsidianCLI.openNotePath(path)
      log.push(`CLI openNotePath: ${opened}`)
    }

    // Fallback to URI scheme
    if (!opened) {
      const config = loadConfig()
      const vaultName = config.vaultPath.split('/').pop() || 'vault'
      const uri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(path)}`
      log.push(`fallback URI: ${uri}`)
      await shell.openExternal(uri)
      log.push('URI opened')
    }

    // Bring Obsidian window to the foreground
    execFile('open', ['-a', 'Obsidian'])

    setLastNoteOpened(path)
    memoryService.logNoteAccess(path)
    console.log('[note:open]', log.join(' | '))
    return { opened, log }
  })

  ipcMain.handle('session:context', async () => {
    const hour = new Date().getHours()
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    const recent = memoryService.getRecentInteractions(5)

    return {
      sessionId: getCurrentSessionId(),
      recentQueries: recent.map(i => ({ query: i.query, timestamp: i.timestamp })),
      lastNoteOpened: getLastNoteOpened(),
      clipboardPreview: null,
      timeOfDay,
      isFirstInvocationToday: isFirstInvocationToday(),
    }
  })

  ipcMain.on('ai:query', (_event, query: string) => {
    handleAIQuery(query, mainWindow, aiService, memoryService).catch((err) => {
      console.error('[ai:query] Unhandled error:', err)
      mainWindow?.webContents.send('ai:chunk', {
        chunk: `Error: ${err instanceof Error ? err.message : String(err)}`,
        done: false,
      })
      mainWindow?.webContents.send('ai:chunk', { chunk: '', done: true })
    })
  })

  ipcMain.handle('capture:note', async (_event, content: string, suggestedPath: string) => {
    const name = suggestedPath.replace(/\.md$/, '').split('/').pop() || suggestedPath
    const folder = suggestedPath.includes('/') ? suggestedPath.slice(0, suggestedPath.lastIndexOf('/') + 1) : undefined

    const created = await obsidianCLI.createNote(name, content, folder)
    if (created) return { success: true, path: suggestedPath }

    // Fallback to direct file write
    const config = loadConfig()
    if (!config.vaultPath) return { success: false, error: 'No vault configured' }

    const { writeFileSync: writeFS, mkdirSync: mkFS, existsSync: existsFS } = require('fs')
    const { join: joinP, dirname: dirnameP } = require('path')

    const fullPath = joinP(config.vaultPath, suggestedPath)
    const dir = dirnameP(fullPath)
    if (!existsFS(dir)) mkFS(dir, { recursive: true })

    writeFS(fullPath, content, 'utf-8')
    return { success: true, path: suggestedPath }
  })

  ipcMain.handle('ai:provider:get', async () => {
    return {
      current: aiService.getProvider(),
      available: aiService.getAvailableProviders(),
    }
  })

  ipcMain.handle('ai:provider:set', async (_event, provider: string) => {
    if (provider === 'gemini' || provider === 'claude') {
      aiService.setProvider(provider)
      return { success: true, provider }
    }
    return { success: false, error: 'Invalid provider' }
  })

  ipcMain.handle('conversation:list', async () => {
    return memoryService.getRecentConversations(20)
  })

  ipcMain.handle('conversation:load', async (_event, conversationId: string) => {
    setCurrentSessionId(conversationId)
    return memoryService.getConversationMessages(conversationId)
  })

  ipcMain.handle('conversation:new', async () => {
    return resetSessionId()
  })

  ipcMain.handle('conversation:delete', async (_event, conversationId: string) => {
    memoryService.deleteConversation(conversationId)
    return { success: true }
  })

  ipcMain.handle('command:forget', async (_event, target: string) => {
    if (target === 'last') {
      memoryService.deleteLastInteraction()
      return { success: true, message: 'Last interaction forgotten.' }
    }
    const count = memoryService.deleteInteractionsByTopic(target)
    return { success: true, message: `Forgot ${count} interactions about "${target}".` }
  })

  ipcMain.handle('command:feedback', async (_event, feedback: string) => {
    const prefsPath = join(homedir(), '.quick-launcher', 'memory', 'PREFERENCES.md')
    const dir = join(homedir(), '.quick-launcher', 'memory')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    if (!existsSync(prefsPath)) {
      writeFileSync(prefsPath, '# User Preferences\n\nThese preferences are loaded into every AI prompt. Added via /feedback.\n', 'utf-8')
      console.log('[feedback] Created PREFERENCES.md')
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const entry = `\n- [${timestamp}] ${feedback}`
    appendFileSync(prefsPath, entry, 'utf-8')
    console.log(`[feedback] Appended preference: "${feedback.slice(0, 60)}"`)
    return { success: true }
  })

  ipcMain.handle('obsidian:search', async (_event, query: string) => {
    return obsidianCLI.search(query)
  })

  ipcMain.handle('obsidian:daily', async () => {
    return obsidianCLI.dailyRead()
  })

  ipcMain.handle('obsidian:daily:append', async (_event, content: string) => {
    return obsidianCLI.dailyAppend(content)
  })

  ipcMain.handle('obsidian:tags', async () => {
    return obsidianCLI.listTags()
  })

  ipcMain.handle('obsidian:backlinks', async (_event, name: string) => {
    return obsidianCLI.getBacklinks(name)
  })

  ipcMain.handle('obsidian:read', async (_event, name: string) => {
    return obsidianCLI.readNote(name)
  })

  ipcMain.handle('obsidian:move', async (_event, file: string, to: string) => {
    return obsidianCLI.moveNote(file, to)
  })

  ipcMain.handle('obsidian:properties', async (_event, name: string) => {
    return obsidianCLI.getProperties(name)
  })

  const KANBAN_DIR = '/Users/jkupo/Documents/Projects/LK-Kanban/lk-kanban'
  ipcMain.handle('kanban:summary', async () => {
    try {
      const raw = execSync('npm run kanban -- list --json', {
        cwd: KANBAN_DIR,
        encoding: 'utf-8',
        timeout: 10000,
      })
      const jsonStart = raw.indexOf('[')
      if (jsonStart === -1) return { cards: [], projects: [] }
      const cards = JSON.parse(raw.slice(jsonStart))

      const projectsRaw = execSync('npm run kanban -- projects', {
        cwd: KANBAN_DIR,
        encoding: 'utf-8',
        timeout: 10000,
      })
      const projects = projectsRaw
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('-'))
        .map(line => {
          const parts = line.trim().split(/\s{2,}/)
          return { slug: parts[0], name: parts[1], color: parts[2] || null }
        })
        .filter(p => p.slug && p.name)

      return { cards, projects }
    } catch (err) {
      console.error('[kanban] Failed to fetch summary:', err)
      return { cards: [], projects: [] }
    }
  })

  ipcMain.handle('open:url', async (_event, url: string) => {
    await shell.openExternal(url)
  })
}
