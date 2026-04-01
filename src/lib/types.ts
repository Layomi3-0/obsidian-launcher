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

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

export interface LauncherAPI {
  search(query: string): Promise<SearchResult[]>
  openNote(path: string): Promise<void>
  hideWindow(): void
  getSessionContext(): Promise<SessionContext>
  sendAIQuery(query: string): void
  captureNote(content: string, suggestedPath: string): Promise<{ success: boolean; path?: string; error?: string }>
  runCommand(command: string, args: string): Promise<{ success: boolean; message?: string }>
  getAIProvider(): Promise<{ current: string; available: string[] }>
  setAIProvider(provider: string): Promise<{ success: boolean; provider?: string }>
  onStreamChunk(callback: (chunk: string, done: boolean) => void): () => void
  onWindowShown(callback: () => void): () => void
  onWindowHidden(callback: () => void): () => void

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
