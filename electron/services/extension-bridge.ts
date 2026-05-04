import { WebSocketServer, WebSocket } from 'ws'
import type { AIService } from './ai'
import type { MemoryService } from './memory'
import type { SearchService } from './search'
import type { ObsidianCLI } from './obsidian-cli'
import { handleAIQuery, cancelRequest, type ChunkSender, type Attachment, getCurrentSessionId, resetSessionId, setCurrentSessionId, setLastNoteOpened, getLastNoteOpened, isFirstInvocationToday } from '../ai-handler'
import { loadOrCreateToken } from './extension-token'

const PORT = 51789
const HOST = '127.0.0.1'

interface BridgeDeps {
  getAIService: () => AIService
  getMemoryService: () => MemoryService
  getSearchService: () => SearchService
  getObsidianCLI: () => ObsidianCLI
}

interface MentionedTabContext {
  title: string
  url: string
  pageText?: string
  selection?: string
}

interface BrowserContext {
  url?: string
  title?: string
  selection?: string
  pageText?: string
  mentionedTabs?: MentionedTabContext[]
}

export function startExtensionBridge(deps: BridgeDeps): WebSocketServer {
  const token = loadOrCreateToken()
  const wss = new WebSocketServer({ host: HOST, port: PORT })

  wss.on('connection', (ws) => attachClient(ws, token, deps))
  wss.on('listening', () => console.log(`[extension-bridge] Listening on ws://${HOST}:${PORT}`))
  wss.on('error', (err) => console.error('[extension-bridge] Error:', err))

  return wss
}

function attachClient(ws: WebSocket, token: string, deps: BridgeDeps): void {
  let authenticated = false
  console.log('[extension-bridge] Client connected')

  ws.on('message', async (raw) => {
    const msg = parseMessage(raw.toString())
    if (!msg) return sendError(ws, '', 'Invalid JSON')

    if (!authenticated) {
      authenticated = handleAuth(ws, msg, token)
      return
    }

    routeMessage(ws, msg, deps).catch((err) => {
      console.error('[extension-bridge] route error:', err)
      sendError(ws, msg.requestId ?? '', err instanceof Error ? err.message : String(err))
    })
  })

  ws.on('close', () => console.log('[extension-bridge] Client disconnected'))
  ws.on('error', (err) => console.error('[extension-bridge] Client error:', err))
}

function parseMessage(raw: string): { type: string; requestId?: string; [k: string]: any } | null {
  try { return JSON.parse(raw) } catch { return null }
}

function handleAuth(ws: WebSocket, msg: any, token: string): boolean {
  if (msg.type !== 'auth' || msg.token !== token) {
    sendJson(ws, { type: 'auth:fail', error: 'Invalid token' })
    ws.close()
    return false
  }
  sendJson(ws, { type: 'auth:ok' })
  return true
}

async function routeMessage(ws: WebSocket, msg: any, deps: BridgeDeps): Promise<void> {
  if (msg.type === 'query') return runQuery(ws, msg, deps)
  if (msg.type === 'cancel') return void cancelRequest(msg.requestId)
  if (msg.type === 'rpc') return runRpc(ws, msg, deps)
  sendError(ws, msg.requestId ?? '', `Unknown message type: ${msg.type}`)
}

async function runQuery(ws: WebSocket, msg: any, deps: BridgeDeps): Promise<void> {
  const requestId: string = msg.requestId
  const sender = createWsSender(ws, requestId)
  const query = composeQuery(msg.query as string, msg.browserContext as BrowserContext | undefined)
  const attachments = (msg.attachments ?? []) as Attachment[]

  try {
    await handleAIQuery(requestId, query, sender, deps.getAIService(), deps.getMemoryService(), attachments)
  } catch (err) {
    console.error('[extension-bridge] AI query error:', err)
    sender.send(`Error: ${err instanceof Error ? err.message : String(err)}`)
    sender.finish(false)
  }
}

function composeQuery(query: string, ctx: BrowserContext | undefined): string {
  if (!ctx) return query
  const block = renderBrowserContext(ctx)
  return block ? `${block}\n\n${query}` : query
}

function renderBrowserContext(ctx: BrowserContext): string {
  const lines: string[] = ['<browser_context>']
  lines.push('Only the tabs in this block are visible to you. Do not reference any other tab the user may have open.')
  if (ctx.title) lines.push(`\n[active tab] ${ctx.title}`)
  if (ctx.url) lines.push(`URL: ${ctx.url}`)
  if (ctx.selection) lines.push(`Selection:\n${truncate(ctx.selection, 4000)}`)
  if (ctx.pageText) lines.push(`Page text:\n${truncate(ctx.pageText, 12000)}`)
  for (const tab of ctx.mentionedTabs ?? []) {
    lines.push(`\n[mentioned tab] ${tab.title}`)
    lines.push(`URL: ${tab.url}`)
    if (tab.selection) lines.push(`Selection:\n${truncate(tab.selection, 4000)}`)
    if (tab.pageText) {
      lines.push(`Page text:\n${truncate(tab.pageText, 8000)}`)
    } else {
      lines.push('(page content not extractable — only title and URL are available for this tab)')
    }
  }
  lines.push('</browser_context>')
  return lines.length > 3 ? lines.join('\n') : ''
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}\n…[truncated]` : s
}

function createWsSender(ws: WebSocket, requestId: string): ChunkSender {
  return {
    send: (chunk) => sendJson(ws, { type: 'chunk', requestId, chunk, done: false }),
    finish: (interrupted) => sendJson(ws, { type: 'chunk', requestId, chunk: '', done: true, interrupted }),
  }
}

async function runRpc(ws: WebSocket, msg: any, deps: BridgeDeps): Promise<void> {
  const requestId: string = msg.requestId
  try {
    const data = await dispatchRpc(msg.method, msg.params, deps)
    sendJson(ws, { type: 'rpc:result', requestId, data })
  } catch (err) {
    sendError(ws, requestId, err instanceof Error ? err.message : String(err))
  }
}

async function dispatchRpc(method: string, params: any, deps: BridgeDeps): Promise<unknown> {
  if (method === 'search') return rpcSearch(deps, params?.query)
  if (method === 'sessionContext') return rpcSessionContext(deps)
  if (method === 'getProvider') return rpcGetProvider(deps)
  if (method === 'setProvider') return rpcSetProvider(deps, params?.provider)
  if (method === 'listConversations') return deps.getMemoryService().getRecentConversations(20)
  if (method === 'loadConversation') return rpcLoadConversation(deps, params?.id)
  if (method === 'newConversation') return resetSessionId()
  if (method === 'currentConversation') return rpcCurrentConversation(deps)
  if (method === 'noteOpen') return rpcNoteOpen(deps, params?.path)
  if (method === 'readNote') return deps.getObsidianCLI().readNote(params?.name)
  if (method === 'getSessionId') return getCurrentSessionId()
  throw new Error(`Unknown RPC method: ${method}`)
}

function rpcCurrentConversation(deps: BridgeDeps) {
  const id = getCurrentSessionId()
  const messages = deps.getMemoryService().getConversationMessages(id)
  return { id, messages }
}

function rpcSearch(deps: BridgeDeps, query: string) {
  const frecency = deps.getMemoryService().getFrecencyScores()
  return deps.getSearchService().search(query, 10, frecency, getLastNoteOpened())
}

function rpcSessionContext(deps: BridgeDeps) {
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const recent = deps.getMemoryService().getRecentInteractions(5)
  return {
    sessionId: getCurrentSessionId(),
    recentQueries: recent.map((i) => ({ query: i.query, timestamp: i.timestamp })),
    lastNoteOpened: getLastNoteOpened(),
    clipboardPreview: null,
    timeOfDay,
    isFirstInvocationToday: isFirstInvocationToday(),
  }
}

function rpcGetProvider(deps: BridgeDeps) {
  const ai = deps.getAIService()
  return { current: ai.getProvider(), available: ai.getAvailableProviders() }
}

function rpcSetProvider(deps: BridgeDeps, provider: string) {
  if (provider !== 'gemini' && provider !== 'claude') {
    return { success: false, error: 'Invalid provider' }
  }
  deps.getAIService().setProvider(provider)
  return { success: true, provider }
}

function rpcLoadConversation(deps: BridgeDeps, id: string) {
  setCurrentSessionId(id)
  return deps.getMemoryService().getConversationMessages(id)
}

async function rpcNoteOpen(deps: BridgeDeps, path: string): Promise<{ opened: boolean }> {
  const cli = deps.getObsidianCLI()
  const noteName = path.replace(/\.md$/, '').split('/').pop() || path
  const opened = await cli.openNote(noteName)
  setLastNoteOpened(path)
  deps.getMemoryService().logNoteAccess(path)
  return { opened }
}

function sendJson(ws: WebSocket, obj: unknown): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj))
}

function sendError(ws: WebSocket, requestId: string, error: string): void {
  sendJson(ws, { type: 'rpc:error', requestId, error })
}
