// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock(import('fs'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
  }
})

vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn(),
  })),
}))

import { readFileSync, existsSync } from 'fs'
import { VaultService } from '../../../electron/services/vault'

const mockReadFileSync = vi.mocked(readFileSync)
const mockExistsSync = vi.mocked(existsSync)

function parseNoteContent(content: string, filePath = 'notes/test.md'): any {
  mockExistsSync.mockReturnValue(true)
  mockReadFileSync.mockReturnValue(content as any)

  const vault = new VaultService('/mock/vault')
  const notes: any[] = []
  vault.on('note:added', (note: any) => notes.push(note))

  ;(vault as any).handleFile(filePath, 'added')

  return notes[0] ?? null
}

describe('extractTitle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('extracts title from frontmatter', () => {
    const note = parseNoteContent('---\ntitle: My Custom Title\n---\n# H1 Title\nBody text')
    expect(note.title).toBe('My Custom Title')
  })

  it('extracts title from first h1 when no frontmatter title', () => {
    const note = parseNoteContent('---\ntags: [test]\n---\n# Heading One\nBody text')
    expect(note.title).toBe('Heading One')
  })

  it('falls back to filename when no frontmatter title or h1', () => {
    const note = parseNoteContent('Just some body text without any headings', 'notes/my-file.md')
    expect(note.title).toBe('my-file')
  })
})

describe('extractTags', () => {
  beforeEach(() => vi.clearAllMocks())

  it('extracts tags from frontmatter array', () => {
    const note = parseNoteContent('---\ntags: [alpha, beta, gamma]\n---\nContent')
    expect(note.tags).toContain('alpha')
    expect(note.tags).toContain('beta')
    expect(note.tags).toContain('gamma')
  })

  it('extracts tags from frontmatter string (comma-separated)', () => {
    const note = parseNoteContent('---\ntags: "one, two, three"\n---\nContent')
    expect(note.tags).toContain('one')
    expect(note.tags).toContain('two')
    expect(note.tags).toContain('three')
  })

  it('extracts inline #tags from content', () => {
    const note = parseNoteContent('---\n---\nSome text #inline-tag and #another')
    expect(note.tags).toContain('inline-tag')
    expect(note.tags).toContain('another')
  })

  it('combines frontmatter and inline tags without duplicates', () => {
    const note = parseNoteContent('---\ntags: [shared]\n---\nText #shared #unique')
    expect(note.tags.filter((t: string) => t === 'shared').length).toBe(1)
    expect(note.tags).toContain('unique')
  })

  it('returns empty array when no tags present', () => {
    const note = parseNoteContent('---\n---\nNo tags here')
    expect(note.tags).toEqual([])
  })
})

describe('extractHeadings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('extracts h1 through h6 headings', () => {
    const content = [
      '# Heading 1',
      '## Heading 2',
      '### Heading 3',
      '#### Heading 4',
      '##### Heading 5',
      '###### Heading 6',
      'Regular text',
    ].join('\n')

    const note = parseNoteContent(`---\n---\n${content}`)
    expect(note.headings).toEqual([
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
      'Heading 5',
      'Heading 6',
    ])
  })

  it('returns empty array when no headings', () => {
    const note = parseNoteContent('---\n---\nJust plain text')
    expect(note.headings).toEqual([])
  })

  it('trims whitespace from heading text', () => {
    const note = parseNoteContent('---\n---\n##   Padded Heading   ')
    expect(note.headings).toEqual(['Padded Heading'])
  })
})

describe('extractWikilinks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('extracts simple wikilinks', () => {
    const note = parseNoteContent('---\n---\nLink to [[Note A]] and [[Note B]]')
    expect(note.links).toContain('Note A')
    expect(note.links).toContain('Note B')
  })

  it('extracts wikilinks with aliases', () => {
    const note = parseNoteContent('---\n---\nSee [[Real Note|display text]] here')
    expect(note.links).toContain('Real Note')
    expect(note.links).not.toContain('display text')
  })

  it('returns empty array when no wikilinks', () => {
    const note = parseNoteContent('---\n---\nNo links here')
    expect(note.links).toEqual([])
  })

  it('handles multiple wikilinks on the same line', () => {
    const note = parseNoteContent('---\n---\n[[A]] connects to [[B]] and [[C]]')
    expect(note.links).toEqual(['A', 'B', 'C'])
  })
})
