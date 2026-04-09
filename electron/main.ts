import { app, globalShortcut, ipcMain } from 'electron'
import { join } from 'path'
import { Worker } from 'worker_threads'
import { existsSync } from 'fs'
import { VaultService } from './services/vault'
import { SearchService } from './services/search'
import { MemoryService } from './services/memory'
import { PromptService } from './services/prompts'
import { AIService } from './services/ai'
import { ContextService } from './services/context'
import { ObsidianCLI } from './services/obsidian-cli'
import { generateProjectSummary, invalidateProjectSummaryCache } from './services/project-summary'
import { loadConfig } from './config'
import type { AppConfig } from './config'
import { createWindow, toggleWindow, getMainWindow } from './window'
import { registerIpcHandlers } from './ipc-handlers'

// ── Services ──

let vaultService: VaultService
let searchService: SearchService
let memoryService: MemoryService
let promptService: PromptService
let aiService: AIService
let contextService: ContextService
let obsidianCLI: ObsidianCLI
let embeddingWorker: Worker | null = null

// ── App Lifecycle ──

app.whenReady().then(() => {
  app.dock?.hide()
  const config = loadConfig()

  createCoreServices(config)

  const mainWindow = createWindow()
  globalShortcut.register('Control+Alt+Space', toggleWindow)

  registerIpcHandlers({
    mainWindow,
    getSearchService: () => searchService,
    getMemoryService: () => memoryService,
    getAIService: () => aiService,
    getObsidianCLI: () => obsidianCLI,
  })
  registerServiceInitHandler()
  registerProjectSummaryHandler()

  if (config.onboarded) startVaultServices(config)

  mainWindow.once('ready-to-show', () => mainWindow?.show())
})

// ── Service Creation ──

function createCoreServices(config: AppConfig): void {
  memoryService = new MemoryService()
  searchService = new SearchService()
  promptService = new PromptService()
  obsidianCLI = new ObsidianCLI()
  vaultService = new VaultService(config.vaultPath || '/tmp/empty-vault')
  aiService = new AIService(promptService, searchService, memoryService, vaultService, obsidianCLI)
}

function startVaultServices(config: AppConfig): void {
  if (!config.vaultPath || !existsSync(config.vaultPath)) return

  obsidianCLI.setVaultPath(config.vaultPath)
  obsidianCLI.checkAvailability()

  vaultService = new VaultService(config.vaultPath)
  wireVaultEvents()

  vaultService.on('ready', async () => {
    console.log(`[main] Search index: ${searchService.getDocumentCount()} documents`)
    contextService = new ContextService(vaultService, memoryService, obsidianCLI)
    contextService.start()
    await contextService.ready
    console.log('[main] CONTEXT.md ready')
    triggerEmbedding(config.apiKey)
  })

  vaultService.start()
  aiService = new AIService(promptService, searchService, memoryService, vaultService, obsidianCLI)
  startEmbeddingWorker(config.apiKey)
}

function wireVaultEvents(): void {
  vaultService.on('note:added', (note) => { searchService.addNote(note); invalidateProjectSummaryCache() })
  vaultService.on('note:changed', (note) => { searchService.addNote(note); invalidateProjectSummaryCache() })
  vaultService.on('note:removed', (path) => { searchService.removeNote(path); invalidateProjectSummaryCache() })
}

// ── IPC: Post-Onboarding Service Init ──

function registerServiceInitHandler(): void {
  ipcMain.handle('services:init', async () => {
    try {
      const config = loadConfig()
      console.log('[main] Reinitializing services after onboarding...')
      startVaultServices(config)
      return { success: true }
    } catch (err) {
      console.error('[services:init]', err)
      return { success: false }
    }
  })
}

function registerProjectSummaryHandler(): void {
  ipcMain.handle('project:summary', async () => {
    try {
      const config = loadConfig()
      return generateProjectSummary(vaultService, config.projectsFolder)
    } catch (err) {
      console.error('[project:summary]', err)
      return { projects: [], generatedAt: new Date().toISOString() }
    }
  })
}

// ── Embedding Worker ──

function startEmbeddingWorker(apiKey: string): void {
  if (!apiKey) return

  try {
    embeddingWorker = new Worker(join(__dirname, 'worker.js'))
    embeddingWorker.on('message', handleEmbeddingMessage)
    embeddingWorker.on('error', (err) => console.error('[worker] Error:', err))
  } catch (err) {
    console.error('[worker] Failed to start:', err)
  }
}

function handleEmbeddingMessage(msg: { type: string; success?: boolean; notePath?: string; embedding?: ArrayBuffer }): void {
  if (msg.type === 'embed:result' && msg.success && msg.notePath && msg.embedding) {
    memoryService.storeEmbedding(msg.notePath, new Float32Array(msg.embedding))
  }
  if (msg.type === 'embed:batch:complete') {
    console.log('[worker] Embedding batch complete')
  }
}

function triggerEmbedding(apiKey: string): void {
  if (!embeddingWorker || !apiKey) return

  const notes = vaultService.getAllNotes()
  const embeddedPaths = memoryService.getEmbeddedPaths()
  const needsEmbedding = notes
    .filter(n => !embeddedPaths.has(n.path))
    .map(n => ({ path: n.path, content: n.content }))

  if (needsEmbedding.length === 0) return

  console.log(`[worker] Embedding ${needsEmbedding.length} notes...`)
  embeddingWorker.postMessage({ type: 'embed:batch', notes: needsEmbedding, apiKey })
}

// ── Lifecycle ──

;(app as any).isQuitting = false

app.on('before-quit', () => { ;(app as any).isQuitting = true })

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  embeddingWorker?.terminate()
  memoryService?.close()
  vaultService?.stop()
  obsidianCLI?.stop()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
