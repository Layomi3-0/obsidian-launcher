import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

import type { Interaction, Conversation, ChatMessage, NoteAccess } from './memory-types'
import { cosineSimilarity, SCHEMA_SQL } from './memory-types'

export type { Conversation, ChatMessage }

const DATA_DIR = join(homedir(), '.quick-launcher')
const DB_PATH = join(DATA_DIR, 'launcher.db')

export class MemoryService {
  private db: Database.Database

  constructor() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }

    this.db = new Database(DB_PATH)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.migrate()
  }

  private migrate(): void {
    this.db.exec(SCHEMA_SQL)
  }

  // ── Interactions ──

  logInteraction(query: string, resultClicked: string | null, aiResponse: string | null, sessionId: string): void {
    this.db.prepare(`
      INSERT INTO interactions (query, result_clicked, ai_response, session_id)
      VALUES (?, ?, ?, ?)
    `).run(query, resultClicked, aiResponse, sessionId)
    this.touchConversation(sessionId)
  }

  getRecentInteractions(limit = 20): Interaction[] {
    return this.db.prepare(`
      SELECT * FROM interactions ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as Interaction[]
  }

  getInteractionsBySession(sessionId: string): Interaction[] {
    return this.db.prepare(`
      SELECT * FROM interactions WHERE session_id = ? ORDER BY timestamp ASC
    `).all(sessionId) as Interaction[]
  }

  // ── Conversations ──

  createConversation(id: string, title: string): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO conversations (id, title)
      VALUES (?, ?)
    `).run(id, title)
  }

  private touchConversation(id: string): void {
    this.db.prepare(`
      UPDATE conversations
      SET updated_at = datetime('now'), message_count = message_count + 1
      WHERE id = ?
    `).run(id)
  }

  getRecentConversations(limit = 20): Conversation[] {
    return this.db.prepare(`
      SELECT id, title, created_at, updated_at, message_count
      FROM conversations
      WHERE message_count > 0
      ORDER BY updated_at DESC
      LIMIT ?
    `).all(limit) as Conversation[]
  }

  getConversationMessages(id: string): ChatMessage[] {
    const rows = this.getInteractionsBySession(id)
    const messages: ChatMessage[] = []
    for (const row of rows) {
      messages.push({ role: 'user', content: row.query.replace(/^[>/]\s*/, '') })
      if (row.ai_response) {
        messages.push({ role: 'assistant', content: row.ai_response })
      }
    }
    return messages
  }

  conversationExists(id: string): boolean {
    const row = this.db.prepare(`SELECT 1 FROM conversations WHERE id = ?`).get(id)
    return row !== undefined
  }

  deleteConversation(id: string): void {
    this.db.prepare(`DELETE FROM interactions WHERE session_id = ?`).run(id)
    this.db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id)
  }

  // ── Note Access (frecency) ──

  logNoteAccess(notePath: string): void {
    this.db.prepare(`
      INSERT INTO note_access (note_path, access_count, last_accessed)
      VALUES (?, 1, datetime('now'))
      ON CONFLICT(note_path) DO UPDATE SET
        access_count = access_count + 1,
        last_accessed = datetime('now')
    `).run(notePath)
  }

  getFrecencyScores(): Map<string, number> {
    const rows = this.db.prepare(`
      SELECT note_path, access_count, last_accessed FROM note_access
    `).all() as NoteAccess[]

    const scores = new Map<string, number>()
    const now = Date.now()
    for (const row of rows) {
      const ageMs = now - new Date(row.last_accessed).getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)
      const decay = Math.pow(0.5, ageDays / 7)
      scores.set(row.note_path, row.access_count * decay)
    }
    return scores
  }

  // ── Embeddings ──

  storeEmbedding(notePath: string, embedding: Float32Array): void {
    const buffer = Buffer.from(embedding.buffer)
    this.db.prepare(`
      INSERT INTO embeddings (note_path, embedding, last_embedded)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(note_path) DO UPDATE SET
        embedding = excluded.embedding,
        last_embedded = datetime('now')
    `).run(notePath, buffer)
  }

  getEmbedding(notePath: string): Float32Array | null {
    const row = this.db.prepare(`
      SELECT embedding FROM embeddings WHERE note_path = ?
    `).get(notePath) as { embedding: Buffer } | undefined
    if (!row) return null
    return new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4)
  }

  getAllEmbeddings(): Map<string, Float32Array> {
    const rows = this.db.prepare(`SELECT note_path, embedding FROM embeddings`).all() as { note_path: string; embedding: Buffer }[]
    const map = new Map<string, Float32Array>()
    for (const row of rows) {
      const arr = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4)
      map.set(row.note_path, arr)
    }
    return map
  }

  searchEmbeddings(queryEmbedding: Float32Array, limit = 5): { path: string; similarity: number }[] {
    const allEmbeddings = this.getAllEmbeddings()
    const results: { path: string; similarity: number }[] = []
    for (const [path, embedding] of allEmbeddings) {
      results.push({ path, similarity: cosineSimilarity(queryEmbedding, embedding) })
    }
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
  }

  getEmbeddedPaths(): Set<string> {
    const rows = this.db.prepare(`SELECT note_path FROM embeddings`).all() as { note_path: string }[]
    return new Set(rows.map(r => r.note_path))
  }

  removeEmbedding(notePath: string): void {
    this.db.prepare(`DELETE FROM embeddings WHERE note_path = ?`).run(notePath)
  }

  // ── Working Memory ──

  setWorkingMemory(key: string, value: string): void {
    this.db.prepare(`
      INSERT INTO working_memory (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `).run(key, value)
  }

  getWorkingMemory(key: string): string | null {
    const row = this.db.prepare(`SELECT value FROM working_memory WHERE key = ?`).get(key) as { value: string } | undefined
    return row?.value ?? null
  }

  getAllWorkingMemory(): Record<string, string> {
    const rows = this.db.prepare(`SELECT key, value FROM working_memory`).all() as { key: string; value: string }[]
    const result: Record<string, string> = {}
    for (const row of rows) result[row.key] = row.value
    return result
  }

  // ── Cleanup ──

  deleteInteraction(id: number): void {
    this.db.prepare(`DELETE FROM interactions WHERE id = ?`).run(id)
  }

  deleteInteractionsByTopic(topic: string): number {
    const result = this.db.prepare(`
      DELETE FROM interactions WHERE query LIKE ? OR ai_response LIKE ?
    `).run(`%${topic}%`, `%${topic}%`)
    return result.changes
  }

  deleteLastInteraction(): void {
    this.db.prepare(`DELETE FROM interactions WHERE id = (SELECT MAX(id) FROM interactions)`).run()
  }

  close(): void {
    this.db.close()
  }
}
