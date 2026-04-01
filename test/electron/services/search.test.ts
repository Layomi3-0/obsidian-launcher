// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { SearchService } from '../../../electron/services/search'
import type { Note } from '../../../electron/services/vault'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    path: 'notes/test.md',
    title: 'Test Note',
    content: 'This is a test note about TypeScript and React.',
    frontmatter: {},
    tags: ['typescript', 'react'],
    headings: ['Getting Started', 'Advanced Topics'],
    links: ['Other Note'],
    lastModified: new Date().toISOString(),
    ...overrides,
  }
}

describe('SearchService', () => {
  let search: SearchService

  beforeEach(() => {
    search = new SearchService()
  })

  // ── addNote + search ──

  describe('addNote and search', () => {
    it('adds a note and finds it by title', () => {
      search.addNote(makeNote({ title: 'Kubernetes Guide', path: 'k8s.md' }))

      const results = search.search('Kubernetes')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].title).toBe('Kubernetes Guide')
    })

    it('finds notes by tag content', () => {
      search.addNote(makeNote({ tags: ['devops'], path: 'devops.md', title: 'DevOps' }))

      const results = search.search('devops')
      expect(results.length).toBeGreaterThan(0)
    })

    it('finds notes by body content', () => {
      search.addNote(makeNote({
        content: 'The quick brown fox jumps over the lazy dog',
        path: 'fox.md',
        title: 'Animals',
      }))

      const results = search.search('quick brown fox')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].path).toBe('fox.md')
    })

    it('replaces existing note when path matches', () => {
      search.addNote(makeNote({ path: 'a.md', title: 'Version 1' }))
      search.addNote(makeNote({ path: 'a.md', title: 'Version 2' }))

      expect(search.getDocumentCount()).toBe(1)
      const results = search.search('Version 2')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].title).toBe('Version 2')
    })
  })

  // ── removeNote ──

  describe('removeNote', () => {
    it('removes a note from the index', () => {
      search.addNote(makeNote({ path: 'remove-me.md', title: 'Remove Me' }))
      expect(search.getDocumentCount()).toBe(1)

      search.removeNote('remove-me.md')
      // MiniSearch discard doesn't decrement documentCount immediately,
      // but search should not return the note
      const results = search.search('Remove Me')
      expect(results.length).toBe(0)
    })

    it('does nothing when removing a nonexistent path', () => {
      expect(() => search.removeNote('nonexistent.md')).not.toThrow()
    })
  })

  // ── Empty query ──

  describe('empty query', () => {
    it('returns empty array for empty string', () => {
      search.addNote(makeNote())
      expect(search.search('')).toEqual([])
    })

    it('returns empty array for whitespace-only string', () => {
      search.addNote(makeNote())
      expect(search.search('   ')).toEqual([])
    })
  })

  // ── Composite scoring ──

  describe('composite scoring', () => {
    it('boosts results with frecency scores', () => {
      search.addNote(makeNote({ path: 'a.md', title: 'Alpha Test', content: 'test content' }))
      search.addNote(makeNote({ path: 'b.md', title: 'Beta Test', content: 'test content' }))

      const frecencyScores = new Map([['b.md', 20]])
      const results = search.search('test', 10, frecencyScores)

      expect(results.length).toBe(2)
      const bResult = results.find(r => r.path === 'b.md')
      const aResult = results.find(r => r.path === 'a.md')
      expect(bResult).toBeDefined()
      expect(aResult).toBeDefined()
      // b.md should score higher due to frecency
      expect(bResult!.score).toBeGreaterThan(aResult!.score)
    })

    it('applies recency decay to older notes', () => {
      const recentDate = new Date().toISOString()
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      search.addNote(makeNote({ path: 'recent.md', title: 'Widget Test', lastModified: recentDate }))
      search.addNote(makeNote({ path: 'old.md', title: 'Widget Test', lastModified: oldDate }))

      const results = search.search('Widget Test')
      const recent = results.find(r => r.path === 'recent.md')
      const old = results.find(r => r.path === 'old.md')
      expect(recent).toBeDefined()
      expect(old).toBeDefined()
      expect(recent!.score).toBeGreaterThan(old!.score)
    })

    it('applies context bonus for shared tags with last opened note', () => {
      search.addNote(makeNote({
        path: 'current.md',
        title: 'Current Note',
        tags: ['project-x'],
        content: 'Widget information',
      }))
      search.addNote(makeNote({
        path: 'related.md',
        title: 'Related Widget',
        tags: ['project-x'],
        content: 'Widget details',
      }))
      search.addNote(makeNote({
        path: 'unrelated.md',
        title: 'Unrelated Widget',
        tags: ['cooking'],
        content: 'Widget recipe',
      }))

      const results = search.search('Widget', 10, undefined, 'current.md')
      const related = results.find(r => r.path === 'related.md')
      const unrelated = results.find(r => r.path === 'unrelated.md')
      expect(related).toBeDefined()
      expect(unrelated).toBeDefined()
      expect(related!.score).toBeGreaterThan(unrelated!.score)
    })
  })

  // ── SearchResult fields ──

  describe('result fields', () => {
    it('returns correct fields in each result', () => {
      search.addNote(makeNote({
        path: 'notes/hello.md',
        title: 'Hello World',
        tags: ['greeting'],
        lastModified: '2026-01-01T00:00:00.000Z',
      }))

      const results = search.search('Hello')
      expect(results.length).toBeGreaterThan(0)
      const r = results[0]
      expect(r.path).toBe('notes/hello.md')
      expect(r.title).toBe('Hello World')
      expect(r.tags).toEqual(['greeting'])
      expect(r.lastModified).toBe('2026-01-01T00:00:00.000Z')
      expect(typeof r.score).toBe('number')
      expect(typeof r.snippet).toBe('string')
      expect(['fuzzy', 'fulltext', 'semantic']).toContain(r.matchType)
    })
  })
})

// ── Free function tests (extractSnippet, classifyMatch) ──
// These are not exported, so we test them indirectly through search results.

describe('extractSnippet (via search results)', () => {
  it('extracts a snippet containing the query term', () => {
    const search = new SearchService()
    search.addNote(makeNote({
      path: 'snippet.md',
      title: 'Snippet Test',
      content: 'First line here\nThis line contains the magic word\nThird line',
    }))

    const results = search.search('magic')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].snippet).toContain('magic')
  })

  it('falls back to first meaningful line when no match', () => {
    const search = new SearchService()
    search.addNote(makeNote({
      path: 'fallback.md',
      title: 'Fuzzy Fallback',
      content: 'This is a sufficiently long first line to act as a fallback snippet for testing',
    }))

    // Search by title (fuzzy match), snippet comes from content
    const results = search.search('Fuzzy Fallback')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].snippet.length).toBeGreaterThan(0)
  })
})

describe('classifyMatch (via search results)', () => {
  it('returns fuzzy for title matches', () => {
    const search = new SearchService()
    search.addNote(makeNote({
      path: 'title-match.md',
      title: 'UniqueXyzTitle',
      content: 'No mention of the search term in body',
    }))

    const results = search.search('UniqueXyzTitle')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].matchType).toBe('fuzzy')
  })
})
