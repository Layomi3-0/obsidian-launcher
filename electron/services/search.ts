import MiniSearch from 'minisearch'
import type { Note } from './vault'

export interface SearchResult {
  path: string
  title: string
  snippet: string
  score: number
  matchType: 'fuzzy' | 'fulltext' | 'semantic'
  tags: string[]
  lastModified: string
}

interface IndexedDoc {
  id: string
  title: string
  tags: string
  headings: string
  body: string
  rawNote: Note
}

export class SearchService {
  private index: MiniSearch<IndexedDoc>

  constructor() {
    this.index = new MiniSearch<IndexedDoc>({
      fields: ['title', 'tags', 'headings', 'body'],
      storeFields: ['title', 'tags', 'headings', 'body', 'rawNote'],
      searchOptions: {
        boost: { title: 10, tags: 5, headings: 3, body: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    })
  }

  addNote(note: Note): void {
    const doc = noteToDoc(note)
    if (this.index.has(doc.id)) {
      this.index.replace(doc)
    } else {
      this.index.add(doc)
    }
  }

  removeNote(path: string): void {
    if (this.index.has(path)) {
      this.index.discard(path)
    }
  }

  search(
    query: string,
    limit = 10,
    frecencyScores?: Map<string, number>,
    lastOpenedNotePath?: string | null,
  ): SearchResult[] {
    if (!query.trim()) return []

    const results = this.index.search(query).slice(0, limit * 2)

    // Normalize raw MiniSearch scores to 0-1
    const maxScore = results.length > 0 ? results[0].score : 1

    return results
      .map((result) => {
        const raw = (result as unknown as { rawNote: Note }).rawNote
        const normalizedSearch = result.score / maxScore

        // Frecency component (0-1)
        const frecency = frecencyScores
          ? Math.min((frecencyScores.get(raw.path) ?? 0) / 10, 1)
          : 0

        // Recency component — exponential decay, half-life 7 days
        const ageMs = Date.now() - new Date(raw.lastModified).getTime()
        const ageDays = ageMs / (1000 * 60 * 60 * 24)
        const recency = Math.pow(0.5, ageDays / 7)

        // Context bonus — boost if shares tags/links with last opened note
        let contextBonus = 0
        if (lastOpenedNotePath) {
          const lastNote = this.index.has(lastOpenedNotePath)
            ? (this.index.getStoredFields(lastOpenedNotePath) as unknown as { rawNote: Note })?.rawNote
            : null
          if (lastNote) {
            const sharedTags = raw.tags.filter(t => lastNote.tags.includes(t))
            const sharedLinks = raw.links?.filter(l => lastNote.links?.includes(l)) ?? []
            contextBonus = Math.min((sharedTags.length * 0.3 + sharedLinks.length * 0.2), 1)
          }
        }

        // Composite score: search 45%, frecency 25%, recency 15%, context 15%
        const compositeScore =
          normalizedSearch * 0.45 +
          frecency * 0.25 +
          recency * 0.15 +
          contextBonus * 0.15

        return {
          path: raw.path,
          title: raw.title,
          snippet: extractSnippet(raw.content, query),
          score: compositeScore,
          matchType: classifyMatch(result),
          tags: raw.tags,
          lastModified: raw.lastModified,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  getDocumentCount(): number {
    return this.index.documentCount
  }
}

function noteToDoc(note: Note): IndexedDoc {
  return {
    id: note.path,
    title: note.title,
    tags: note.tags.join(' '),
    headings: note.headings.join(' '),
    body: note.content.slice(0, 5000),
    rawNote: note,
  }
}

function extractSnippet(content: string, query: string): string {
  const bodyWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '')
  const lines = bodyWithoutFrontmatter.split('\n').filter(l => l.trim())
  const queryLower = query.toLowerCase()

  // Find the line that best matches the query
  for (const line of lines) {
    if (line.toLowerCase().includes(queryLower)) {
      const clean = line.replace(/^#+\s*/, '').trim()
      return clean.length > 120 ? clean.slice(0, 120) + '...' : clean
    }
  }

  // Fallback: first meaningful line
  for (const line of lines) {
    const clean = line.replace(/^#+\s*/, '').trim()
    if (clean.length > 20) {
      return clean.length > 120 ? clean.slice(0, 120) + '...' : clean
    }
  }

  return lines[0]?.trim().slice(0, 120) || ''
}

function classifyMatch(result: { match: Record<string, string[]> }): SearchResult['matchType'] {
  const matchedFields = Object.values(result.match).flat()
  if (matchedFields.includes('title')) return 'fuzzy'
  if (matchedFields.includes('tags') || matchedFields.includes('headings')) return 'fulltext'
  return 'fulltext'
}
