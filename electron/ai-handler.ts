import type { BrowserWindow } from 'electron'
import type { AIService } from './services/ai'
import type { MemoryService } from './services/memory'
import { estimateTokens, CONTEXT_BUDGET } from './services/ai-helpers'

// ── Session State ──

let currentSessionId = `session-${Date.now()}`
let lastNoteOpened: string | null = null
let lastInvocationDate: string | null = null

export function getCurrentSessionId(): string {
  return currentSessionId
}

export function setCurrentSessionId(id: string): void {
  currentSessionId = id
}

export function resetSessionId(): string {
  currentSessionId = `session-${Date.now()}`
  return currentSessionId
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

export async function handleAIQuery(
  query: string,
  mainWindow: BrowserWindow | null,
  aiService: AIService,
  memoryService: MemoryService,
  attachments: Attachment[] = [],
): Promise<void> {
  console.log('[ai:query] Received:', query.slice(0, 80), `(${attachments.length} attachments)`)
  const sender = createChunkSender(mainWindow)

  if (!aiService.isAvailable()) {
    sender.send('AI is not configured. Set API keys in ~/.quick-launcher/config.toml')
    sender.finish()
    return
  }

  ensureConversationExists(memoryService, query)
  const sessionContext = buildSessionContext(memoryService)
  const fullResponse = await streamToRenderer(aiService, sender, query, sessionContext, attachments)

  memoryService.logInteraction(query, null, fullResponse, currentSessionId)
  console.log('[ai:query] Complete, response length:', fullResponse.length)
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
): Promise<string> {
  let fullResponse = ''

  try {
    for await (const chunk of aiService.streamQuery(query, sessionContext, attachments)) {
      fullResponse += chunk
      sender.send(chunk)
    }
  } catch (err) {
    console.error('[ai:query] Stream error:', err)
    const errorMsg = `Error: ${err instanceof Error ? err.message : String(err)}`
    sender.send(errorMsg)
    fullResponse += errorMsg
  }

  sender.finish()
  return fullResponse
}

interface ChunkSender {
  send(chunk: string): void
  finish(): void
}

function createChunkSender(window: BrowserWindow | null): ChunkSender {
  return {
    send: (chunk) => window?.webContents.send('ai:chunk', { chunk, done: false }),
    finish: () => window?.webContents.send('ai:chunk', { chunk: '', done: true }),
  }
}

type ConversationMessage = { role: 'user' | 'assistant'; content: string }

function budgetHistory(messages: { role: string; content: string }[], tokenBudget: number): ConversationMessage[] {
  const typed = messages as ConversationMessage[]
  if (typed.length === 0) return []

  const totalTokens = typed.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  if (totalTokens <= tokenBudget) return typed

  // Always keep last 3 exchanges verbatim
  const recentCount = Math.min(6, typed.length)
  const recent = typed.slice(-recentCount)
  let usedTokens = recent.reduce((sum, m) => sum + estimateTokens(m.content), 0)

  // Fill remaining budget with older messages, newest-first
  const older = typed.slice(0, -recentCount)
  const kept: ConversationMessage[] = []
  for (let i = older.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(older[i].content)
    if (usedTokens + msgTokens > tokenBudget) break
    kept.unshift(older[i])
    usedTokens += msgTokens
  }

  return [...kept, ...recent]
}
