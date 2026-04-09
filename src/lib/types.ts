export interface SearchResult {
  path: string
  title: string
  snippet: string
  score: number
  matchType: 'fuzzy' | 'fulltext' | 'semantic'
  tags: string[]
  lastModified: string
}

export interface SessionContext {
  sessionId: string
  recentQueries: { query: string; timestamp: string }[]
  lastNoteOpened: string | null
  clipboardPreview: string | null
  timeOfDay: 'morning' | 'afternoon' | 'evening'
  isFirstInvocationToday: boolean
}

export interface Conversation {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  message_count: number
}

export interface Attachment {
  id: string
  name: string
  mimeType: string
  base64: string
  size: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  attachments?: Attachment[]
  interrupted?: boolean
}

export interface QueuedMessage {
  id: string
  content: string
  attachments?: Attachment[]
}

export interface StreamChunkData {
  requestId: string
  chunk: string
  done: boolean
  interrupted?: boolean
}

export interface ObsidianSearchResult {
  path: string
  title: string
}

export interface ObsidianTag {
  name: string
}

export interface KanbanCard {
  id: string
  fullId: string
  title: string
  status: string
  priority: string
  owner: string
  project: string
  projectSlug: string
}

export interface KanbanProject {
  slug: string
  name: string
  color: string | null
}

export interface KanbanSummary {
  cards: KanbanCard[]
  projects: KanbanProject[]
}

export type AIProvider = 'gemini' | 'claude'

export interface AppSettings {
  vaultPath: string
  apiKey: string
  provider: AIProvider
  onboarded: boolean
  kanbanEnabled: boolean
  kanbanPath: string
  projectsFolder: string
}

export interface ProjectSummary {
  name: string
  path: string
  status: string
  lastActivity: string
  nextAction: string
  isStale: boolean
}

export interface ProjectSummaryResult {
  projects: ProjectSummary[]
  generatedAt: string
}

export interface LauncherAPI {
  search(query: string): Promise<SearchResult[]>
  openNote(path: string): Promise<void>
  hideWindow(): void
  setCompact(): void
  setExpanded(): void
  onCompactChange(callback: (compact: boolean) => void): () => void
  getSessionContext(): Promise<SessionContext>
  sendAIQuery(requestId: string, query: string, attachments?: Attachment[]): void
  cancelAIQuery(requestId: string): void
  captureNote(content: string, suggestedPath: string): Promise<{ success: boolean; path?: string; error?: string }>
  runCommand(command: string, args: string): Promise<{ success: boolean; message?: string }>
  getAIProvider(): Promise<{ current: string; available: string[] }>
  setAIProvider(provider: string): Promise<{ success: boolean; provider?: string }>
  onStreamChunk(callback: (data: StreamChunkData) => void): () => void
  onWindowShown(callback: () => void): () => void
  onWindowHidden(callback: () => void): () => void

  // Config / Onboarding
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<{ success: boolean }>
  pickFolder(): Promise<string | null>
  validateApiKey(key: string, provider?: string): Promise<{ valid: boolean; error?: string }>
  initServices(): Promise<{ success: boolean }>
  getProjectSummary(): Promise<ProjectSummaryResult>

  // Conversations
  getConversations(): Promise<Conversation[]>
  loadConversation(id: string): Promise<ChatMessage[]>
  newConversation(): Promise<string>
  deleteConversation(id: string): Promise<void>

  // Kanban
  getKanbanSummary(): Promise<KanbanSummary>
  openUrl(url: string): Promise<void>

  // Obsidian CLI
  obsidianSearch(query: string): Promise<ObsidianSearchResult[]>
  getDailyNote(): Promise<string | null>
  appendToDaily(content: string): Promise<boolean>
  getTags(): Promise<ObsidianTag[]>
  getBacklinks(name: string): Promise<string[]>
  readNote(name: string): Promise<string | null>
  moveNote(file: string, to: string): Promise<boolean>
  getProperties(name: string): Promise<Record<string, string> | null>
}

declare global {
  interface Window {
    launcher: LauncherAPI
  }
}
