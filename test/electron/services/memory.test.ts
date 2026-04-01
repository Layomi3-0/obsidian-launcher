// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { cosineSimilarity, SCHEMA_SQL } from '../../../electron/services/memory-types'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const a = new Float32Array([1, 2, 3])
    const b = new Float32Array([1, 2, 3])

    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5)
  })

  it('returns 0 for orthogonal vectors', () => {
    const a = new Float32Array([1, 0, 0])
    const b = new Float32Array([0, 1, 0])

    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5)
  })

  it('returns -1 for opposite vectors', () => {
    const a = new Float32Array([1, 0, 0])
    const b = new Float32Array([-1, 0, 0])

    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5)
  })

  it('returns 0 for vectors of different lengths', () => {
    const a = new Float32Array([1, 2, 3])
    const b = new Float32Array([1, 2])

    expect(cosineSimilarity(a, b)).toBe(0)
  })

  it('returns 0 when one vector is all zeros', () => {
    const a = new Float32Array([1, 2, 3])
    const b = new Float32Array([0, 0, 0])

    expect(cosineSimilarity(a, b)).toBe(0)
  })

  it('handles high-dimensional vectors', () => {
    const size = 768
    const a = new Float32Array(size)
    const b = new Float32Array(size)

    for (let i = 0; i < size; i++) {
      a[i] = Math.random() - 0.5
      b[i] = a[i] // identical
    }

    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5)
  })

  it('computes correct similarity for known vectors', () => {
    // cos([1,1], [1,0]) = 1 / (sqrt(2) * 1) = 0.7071...
    const a = new Float32Array([1, 1])
    const b = new Float32Array([1, 0])

    expect(cosineSimilarity(a, b)).toBeCloseTo(1 / Math.sqrt(2), 5)
  })
})

describe('SCHEMA_SQL', () => {
  it('defines all required tables', () => {
    expect(SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS interactions')
    expect(SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS note_access')
    expect(SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS embeddings')
    expect(SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS working_memory')
    expect(SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS conversations')
  })

  it('defines required indexes', () => {
    expect(SCHEMA_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_interactions_timestamp')
    expect(SCHEMA_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_interactions_session')
    expect(SCHEMA_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_note_access_count')
    expect(SCHEMA_SQL).toContain('CREATE INDEX IF NOT EXISTS idx_conversations_updated')
  })
})

describe('memory-types interfaces', () => {
  it('Interaction type has expected shape', () => {
    // Type-level test: ensure the interface compiles correctly
    const interaction: import('../../../electron/services/memory-types').Interaction = {
      id: 1,
      timestamp: '2026-01-01T00:00:00Z',
      query: 'test query',
      result_clicked: null,
      ai_response: 'response',
      session_id: 'session-1',
    }

    expect(interaction.id).toBe(1)
    expect(interaction.result_clicked).toBeNull()
  })

  it('NoteAccess type has expected shape', () => {
    const access: import('../../../electron/services/memory-types').NoteAccess = {
      note_path: 'test.md',
      access_count: 5,
      last_accessed: '2026-01-01',
    }

    expect(access.access_count).toBe(5)
  })
})
