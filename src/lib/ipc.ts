import type { SearchResult, SessionContext, Conversation, ChatMessage, ObsidianSearchResult, ObsidianTag, KanbanSummary } from './types'

function api() {
  return window.launcher ?? null
}

export function search(query: string): Promise<SearchResult[]> {
  return api()?.search(query) ?? Promise.resolve([])
}

export function openNote(path: string): Promise<void> {
  return api()?.openNote(path) ?? Promise.resolve()
}

export function hideWindow(): void {
  api()?.hideWindow()
}

export function getSessionContext(): Promise<SessionContext> {
  return api()?.getSessionContext() ?? Promise.resolve({
    sessionId: `session-${Date.now()}`,
    recentQueries: [],
    lastNoteOpened: null,
    clipboardPreview: null,
    timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
    isFirstInvocationToday: true,
  })
}

export function sendAIQuery(query: string): void {
  api()?.sendAIQuery(query)
}

export function captureNote(content: string, suggestedPath: string) {
  return api()?.captureNote(content, suggestedPath) ?? Promise.resolve({ success: false, error: 'Not available' })
}

export function runCommand(command: string, args: string) {
  return api()?.runCommand(command, args) ?? Promise.resolve({ success: false })
}

export function onStreamChunk(callback: (chunk: string, done: boolean) => void): () => void {
  return api()?.onStreamChunk(callback) ?? (() => {})
}

export function onWindowShown(callback: () => void): () => void {
  return api()?.onWindowShown(callback) ?? (() => {})
}

export function onWindowHidden(callback: () => void): () => void {
  return api()?.onWindowHidden(callback) ?? (() => {})
}

// Conversations

export function getConversations(): Promise<Conversation[]> {
  return api()?.getConversations() ?? Promise.resolve([])
}

export function loadConversation(id: string): Promise<ChatMessage[]> {
  return api()?.loadConversation(id) ?? Promise.resolve([])
}

export function newConversation(): Promise<string> {
  return api()?.newConversation() ?? Promise.resolve(`session-${Date.now()}`)
}

export function deleteConversation(id: string): Promise<void> {
  return api()?.deleteConversation(id) ?? Promise.resolve()
}

// Kanban

export function getKanbanSummary(): Promise<KanbanSummary> {
  return api()?.getKanbanSummary() ?? Promise.resolve({ cards: [], projects: [] })
}

export function openUrl(url: string): Promise<void> {
  return api()?.openUrl(url) ?? Promise.resolve()
}

// Obsidian CLI

export function obsidianSearch(query: string): Promise<ObsidianSearchResult[]> {
  return api()?.obsidianSearch(query) ?? Promise.resolve([])
}

export function getDailyNote(): Promise<string | null> {
  return api()?.getDailyNote() ?? Promise.resolve(null)
}

export function appendToDaily(content: string): Promise<boolean> {
  return api()?.appendToDaily(content) ?? Promise.resolve(false)
}

export function getTags(): Promise<ObsidianTag[]> {
  return api()?.getTags() ?? Promise.resolve([])
}

export function getBacklinks(name: string): Promise<string[]> {
  return api()?.getBacklinks(name) ?? Promise.resolve([])
}

export function readNote(name: string): Promise<string | null> {
  return api()?.readNote(name) ?? Promise.resolve(null)
}

export function moveNote(file: string, to: string): Promise<boolean> {
  return api()?.moveNote(file, to) ?? Promise.resolve(false)
}

export function getProperties(name: string): Promise<Record<string, string> | null> {
  return api()?.getProperties(name) ?? Promise.resolve(null)
}
