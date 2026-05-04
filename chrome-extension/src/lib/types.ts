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

export interface StreamChunkData {
  requestId: string
  chunk: string
  done: boolean
  interrupted?: boolean
}

export interface MentionedTabContext {
  title: string
  url: string
  pageText?: string
  selection?: string
}

export interface BrowserContext {
  url?: string
  title?: string
  selection?: string
  pageText?: string
  mentionedTabs?: MentionedTabContext[]
}

export interface MentionedTab {
  tabId: number
  title: string
  url: string
}

export type AIProvider = 'gemini' | 'claude'
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unauthorized'
