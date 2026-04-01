export interface Interaction {
  id: number
  timestamp: string
  query: string
  result_clicked: string | null
  ai_response: string | null
  session_id: string
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

export interface NoteAccess {
  note_path: string
  access_count: number
  last_accessed: string
}

export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    query TEXT NOT NULL,
    result_clicked TEXT,
    ai_response TEXT,
    session_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS note_access (
    note_path TEXT PRIMARY KEY,
    access_count INTEGER DEFAULT 1,
    last_accessed TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS embeddings (
    note_path TEXT PRIMARY KEY,
    embedding BLOB NOT NULL,
    last_embedded TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS working_memory (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    message_count INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);
  CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id);
  CREATE INDEX IF NOT EXISTS idx_note_access_count ON note_access(access_count DESC);
  CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
`

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
