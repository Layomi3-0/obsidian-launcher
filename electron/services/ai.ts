import { GoogleGenerativeAI } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'
import type { PromptService } from './prompts'
import type { SearchService } from './search'
import type { MemoryService } from './memory'
import type { VaultService } from './vault'
import type { ObsidianCLI } from './obsidian-cli'
import { loadAIConfig, formatNoteChunk, buildUserMessage, CONTEXT_BUDGET } from './ai-helpers'
import type { AIConfig, AIProvider } from './ai-helpers'
import { streamGemini, streamClaude } from './ai-streaming'
import { streamBriefing } from './ai-briefing'
import type { Attachment } from '../ai-handler'

export type { AIProvider } from './ai-helpers'

interface SessionContext {
  recentQueries: string[]
  lastNoteOpened: string | null
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
}

export class AIService {
  private geminiClient: GoogleGenerativeAI | null = null
  private anthropicClient: Anthropic | null = null
  private config: AIConfig
  private promptService: PromptService
  private searchService: SearchService
  private memoryService: MemoryService
  private vaultService: VaultService
  private obsidianCLI: ObsidianCLI | null

  constructor(
    promptService: PromptService,
    searchService: SearchService,
    memoryService: MemoryService,
    vaultService: VaultService,
    obsidianCLI?: ObsidianCLI,
  ) {
    this.promptService = promptService
    this.searchService = searchService
    this.memoryService = memoryService
    this.vaultService = vaultService
    this.obsidianCLI = obsidianCLI ?? null
    this.config = loadAIConfig()

    this.initClients()
  }

  private initClients(): void {
    if (this.config.geminiApiKey) {
      this.geminiClient = new GoogleGenerativeAI(this.config.geminiApiKey)
      console.log(`[ai] Gemini client initialized (model: ${this.config.geminiModel})`)
    }

    if (this.config.anthropicApiKey) {
      this.anthropicClient = new Anthropic({ apiKey: this.config.anthropicApiKey })
      console.log(`[ai] Claude client initialized (model: ${this.config.anthropicModel})`)
    }

    if (!this.geminiClient && !this.anthropicClient) {
      console.warn('[ai] No AI provider configured — set keys in ~/.quick-launcher/config.toml')
    }
  }

  isAvailable(): boolean {
    return this.getActiveClient() !== null
  }

  getProvider(): AIProvider {
    return this.config.provider
  }

  setProvider(provider: AIProvider): void {
    this.config.provider = provider
    console.log(`[ai] Switched to provider: ${provider}`)
  }

  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = []
    if (this.geminiClient) providers.push('gemini')
    if (this.anthropicClient) providers.push('claude')
    return providers
  }

  async *streamQuery(query: string, session: SessionContext, attachments: Attachment[] = []): AsyncGenerator<string> {
    if (!this.isAvailable()) {
      yield 'No AI provider configured. Add API keys to ~/.quick-launcher/config.toml'
      return
    }

    const skill = this.promptService.detectSkill(query)
    const systemPrompt = this.promptService.assembleSystemPrompt(skill ?? undefined)
    const recentHistory = formatRecentQueries(session.recentQueries)

    if (skill === 'daily-briefing') {
      yield* streamBriefing(this.buildBriefingDeps(), query, systemPrompt, recentHistory)
      return
    }

    yield* this.streamWithContext(query, skill, systemPrompt, recentHistory, session, attachments)
  }

  async embedText(text: string): Promise<Float32Array | null> {
    if (!this.geminiClient) return null

    const model = this.geminiClient.getGenerativeModel({ model: 'gemini-embedding-001' })
    const result = await model.embedContent(text)
    return new Float32Array(result.embedding.values)
  }

  private async *streamWithContext(
    query: string,
    skill: string | null,
    systemPrompt: string,
    recentHistory: string,
    session: SessionContext,
    attachments: Attachment[] = [],
  ): AsyncGenerator<string> {
    const relevantContext = await this.gatherContext(query, skill)
    const userMessage = buildUserMessage(query, relevantContext, recentHistory, session.lastNoteOpened, CONTEXT_BUDGET.VAULT_CONTEXT * 4)
    const history = session.conversationHistory ?? []
    console.log(`[ai] Context: ${relevantContext.length} chunks, History: ${history.length} msgs, Attachments: ${attachments.length}, Provider: ${this.config.provider}`)
    logPromptDetails(systemPrompt, userMessage)

    yield* this.streamViaProvider(systemPrompt, userMessage, history, attachments)
  }

  private async *streamViaProvider(
    systemPrompt: string,
    userMessage: string,
    history: { role: string; content: string }[],
    attachments: Attachment[] = [],
  ): AsyncGenerator<string> {
    if (this.config.provider === 'claude' && this.anthropicClient) {
      yield* streamClaude(this.anthropicClient, this.config.anthropicModel, systemPrompt, userMessage, this.obsidianCLI, { conversationHistory: history, attachments })
    } else if (this.geminiClient) {
      yield* streamGemini(this.geminiClient, this.config.geminiModel, systemPrompt, userMessage, this.obsidianCLI, { conversationHistory: history, attachments })
    } else {
      yield 'Selected provider is not configured. Check your API keys.'
    }
  }

  private buildBriefingDeps() {
    return {
      geminiClient: this.geminiClient,
      anthropicClient: this.anthropicClient,
      config: this.config,
      vaultService: this.vaultService,
      obsidianCLI: this.obsidianCLI,
    }
  }

  private async gatherContext(query: string, skill?: string | null): Promise<string[]> {
    const dedup = new NoteDeduplicator()

    const keywordResults = this.searchService.search(query, 5)
    for (const result of keywordResults) {
      const note = this.vaultService.getNote(result.path)
      if (note) dedup.add(note.path, note.title, note.content)
    }

    const [cliResults, semanticResults] = await Promise.all([
      this.searchViaCLI(query),
      this.searchViaEmbeddings(query),
    ])

    for (const result of cliResults) {
      if (dedup.hasSeen(result.path)) continue
      const content = await this.readNoteContent(result.path, result.title)
      if (content) dedup.add(result.path, result.title, content)
    }

    for (const result of semanticResults) {
      const note = this.vaultService.getNote(result.path)
      if (note) dedup.add(note.path, note.title, note.content)
    }

    return dedup.chunks
  }

  private async searchViaCLI(query: string): Promise<{ path: string; title: string }[]> {
    if (!this.obsidianCLI?.isAvailable()) return []

    try {
      return await this.obsidianCLI.search(query.replace(/^[/>]\s*/, '').trim())
    } catch (err) {
      console.error('[ai] CLI search failed:', err)
      return []
    }
  }

  private async searchViaEmbeddings(query: string): Promise<{ path: string }[]> {
    try {
      const queryEmbedding = await this.embedText(query)
      if (!queryEmbedding) return []
      return this.memoryService.searchEmbeddings(queryEmbedding, 5)
    } catch (err) {
      console.error('[ai] Semantic search failed:', err)
      return []
    }
  }

  private async readNoteContent(path: string, title: string): Promise<string | null> {
    const note = this.vaultService.getNote(path)
    if (note) return note.content
    if (!this.obsidianCLI?.isAvailable()) return null
    return this.obsidianCLI.readNote(title)
  }

  private getActiveClient(): 'gemini' | 'claude' | null {
    if (this.config.provider === 'claude' && this.anthropicClient) return 'claude'
    if (this.config.provider === 'gemini' && this.geminiClient) return 'gemini'
    if (this.geminiClient) return 'gemini'
    if (this.anthropicClient) return 'claude'
    return null
  }
}

function logPromptDetails(systemPrompt: string, userMessage: string): void {
  const sections = systemPrompt.split('\n\n---\n\n')
  console.log('[ai:prompt] ═══════════════════════════════════════')
  console.log(`[ai:prompt] System prompt: ${systemPrompt.length} chars, ${sections.length} sections`)
  for (let i = 0; i < sections.length; i++) {
    const preview = sections[i].slice(0, 80).replace(/\n/g, ' ')
    console.log(`[ai:prompt]   [${i + 1}] ${preview}...`)
  }
  console.log(`[ai:prompt] User message: ${userMessage.length} chars`)
  const userPreview = userMessage.slice(0, 200).replace(/\n/g, ' ')
  console.log(`[ai:prompt]   ${userPreview}...`)
  console.log('[ai:prompt] ═══════════════════════════════════════')
}

function formatRecentQueries(queries: string[]): string {
  return queries.slice(-5).map(q => `- ${q}`).join('\n')
}

class NoteDeduplicator {
  private seenPaths = new Set<string>()
  readonly chunks: string[] = []

  hasSeen(path: string): boolean {
    return this.seenPaths.has(path)
  }

  add(path: string, title: string, content: string): void {
    if (this.seenPaths.has(path)) return
    this.seenPaths.add(path)
    this.chunks.push(formatNoteChunk(path, title, content))
  }
}
