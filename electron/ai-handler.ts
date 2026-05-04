import type { BrowserWindow } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { AIService } from './services/ai'
import type { MemoryService } from './services/memory'
import { estimateTokens, CONTEXT_BUDGET } from './services/ai-helpers'

const SESSION_DIR = join(homedir(), '.brain-dump')
const SESSION_FILE = join(SESSION_DIR, 'last-session-id')

export interface ChunkSender {
  send(chunk: string): void
  finish(interrupted: boolean): void
}

export function createWindowSender(window: BrowserWindow | null, requestId: string): ChunkSender {
  return {
    send: (chunk) => window?.webContents.send('ai:chunk', { requestId, chunk, done: false }),
    finish: (interrupted) => window?.webContents.send('ai:chunk', { requestId, chunk: '', done: true, interrupted }),
  }
}

// ── Session State ──

let currentSessionId = loadOrCreateSessionId()
let lastNoteOpened: string | null = null
let lastInvocationDate: string | null = null

export function getCurrentSessionId(): string {
  return currentSessionId
}

export function setCurrentSessionId(id: string): void {
  currentSessionId = id
  persistSessionId(id)
}

export function resetSessionId(): string {
  currentSessionId = `session-${Date.now()}`
  persistSessionId(currentSessionId)
  return currentSessionId
}

function loadOrCreateSessionId(): string {
  try {
    if (existsSync(SESSION_FILE)) {
      const id = readFileSync(SESSION_FILE, 'utf-8').trim()
      if (id) return id
    }
  } catch (err) {
    console.warn('[ai-handler] failed to read persisted session ID:', err)
  }
  const fresh = `session-${Date.now()}`
  persistSessionId(fresh)
  return fresh
}

function persistSessionId(id: string): void {
  try {
    if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true })
    writeFileSync(SESSION_FILE, id, 'utf-8')
  } catch (err) {
    console.warn('[ai-handler] failed to persist session ID:', err)
  }
}

export function getLastNoteOpened(): string | null {
  return lastNoteOpened
}

export function setLastNoteOpened(path: string): void {
  lastNoteOpened = path
}

export function isFirstInvocationToday(): boolean {
  const today = new Date().toISOString().split('T')[0]
  if (lastInvocationDate !== today) {
    lastInvocationDate = today
    return true
  }
  return false
}

// ── Attachment Type ──

export interface Attachment {
  id: string
  name: string
  mimeType: string
  base64: string
  size: number
}

// ── AI Query ──

const activeRequests = new Map<string, AbortController>()
const pendingCancels = new Set<string>()
const cancelTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

export function cancelRequest(requestId: string): void {
  const controller = activeRequests.get(requestId)
  if (!controller) {
    console.log(`[ai:cancel] No active request with id ${requestId}`)
    return
  }
  console.log(`[ai:cancel] Aborting request ${requestId}`)
  pendingCancels.add(requestId)
  controller.abort()
  activeRequests.delete(requestId)
}

function scheduleCancelSafety(requestId: string, sender: ChunkSender): void {
  const timeout = setTimeout(() => {
    cancelTimeouts.delete(requestId)
    if (pendingCancels.has(requestId)) {
      console.warn(`[ai:cancel] Force-finishing stale request ${requestId}`)
      pendingCancels.delete(requestId)
      sender.finish(true)
    }
  }, 3000)
  cancelTimeouts.set(requestId, timeout)
}

function clearCancelSafety(requestId: string): void {
  pendingCancels.delete(requestId)
  const timeout = cancelTimeouts.get(requestId)
  if (timeout) {
    clearTimeout(timeout)
    cancelTimeouts.delete(requestId)
  }
}

export async function handleAIQuery(
  requestId: string,
  query: string,
  sender: ChunkSender,
  aiService: AIService,
  memoryService: MemoryService,
  attachments: Attachment[] = [],
): Promise<void> {
  console.log(`[ai:query] Received (${requestId}):`, query.slice(0, 80), `(${attachments.length} attachments)`)

  if (!aiService.isAvailable()) {
    sender.send('AI is not configured. Set API keys in ~/.brain-dump/config.toml')
    sender.finish(false)
    return
  }

  const controller = new AbortController()
  activeRequests.set(requestId, controller)

  controller.signal.addEventListener('abort', () => {
    scheduleCancelSafety(requestId, sender)
  }, { once: true })

  try {
    ensureConversationExists(memoryService, query)
    const sessionContext = buildSessionContext(memoryService)
    const { fullResponse, interrupted } = await streamToRenderer(
      aiService, sender, query, sessionContext, attachments, controller.signal,
    )

    if (fullResponse.length > 0) {
      memoryService.logInteraction(query, null, fullResponse, currentSessionId)
    }
    console.log(`[ai:query] Complete (${requestId}), length: ${fullResponse.length}, interrupted: ${interrupted}`)
  } finally {
    activeRequests.delete(requestId)
    clearCancelSafety(requestId)
  }
}

function ensureConversationExists(memoryService: MemoryService, query: string): void {
  if (memoryService.conversationExists(currentSessionId)) return

  const title = query.replace(/^[>/]\s*/, '').trim().slice(0, 50)
  memoryService.createConversation(currentSessionId, title)
  console.log(`[ai:query] Created conversation: ${currentSessionId} — "${title}"`)
}

function buildSessionContext(memoryService: MemoryService) {
  const allMessages = memoryService.getConversationMessages(currentSessionId)
  const recentInteractions = memoryService.getRecentInteractions(5)

  return {
    recentQueries: recentInteractions.map(i => i.query),
    lastNoteOpened,
    conversationHistory: budgetHistory(allMessages, CONTEXT_BUDGET.HISTORY),
  }
}

async function streamToRenderer(
  aiService: AIService,
  sender: ChunkSender,
  query: string,
  sessionContext: { recentQueries: string[]; lastNoteOpened: string | null; conversationHistory: ConversationMessage[] },
  attachments: Attachment[] = [],
  signal?: AbortSignal,
): Promise<{ fullResponse: string; interrupted: boolean }> {
  let fullResponse = ''
  let interrupted = false

  try {
    for await (const chunk of aiService.streamQuery(query, sessionContext, attachments, signal)) {
      if (signal?.aborted) {
        interrupted = true
        break
      }
      fullResponse += chunk
      sender.send(chunk)
    }
  } catch (err) {
    if (isAbortError(err) || signal?.aborted) {
      interrupted = true
      console.log('[ai:query] Stream aborted')
    } else {
      console.error('[ai:query] Stream error:', err)
      const errorMsg = `Error: ${err instanceof Error ? err.message : String(err)}`
      sender.send(errorMsg)
      fullResponse += errorMsg
    }
  }

  sender.finish(interrupted)
  return { fullResponse, interrupted }
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; message?: string }
  return e.name === 'AbortError' || e.name === 'APIUserAbortError' || e.message?.toLowerCase().includes('abort') === true
}

type ConversationMessage = { role: 'user' | 'assistant'; content: string }

function budgetHistory(messages: { role: string; content: string }[], tokenBudget: number): ConversationMessage[] {
  const typed = messages as ConversationMessage[]
  if (typed.length === 0) return []

  const totalTokens = typed.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  if (totalTokens <= tokenBudget) return typed

  // Keep recent messages first, then fill with older ones — all within budget
  const result: ConversationMessage[] = []
  let usedTokens = 0

  // Add messages from newest to oldest, respecting budget
  for (let i = typed.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(typed[i].content)
    if (usedTokens + msgTokens > tokenBudget) break
    result.unshift(typed[i])
    usedTokens += msgTokens
  }

  return result
}
