// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Note } from '../../../electron/services/vault'
import {
  generateProjectSummary,
  invalidateProjectSummaryCache,
} from '../../../electron/services/project-summary'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    path: 'Projects/default.md',
    title: 'Default',
    content: '',
    frontmatter: {},
    tags: [],
    headings: [],
    links: [],
    lastModified: new Date().toISOString(),
    ...overrides,
  }
}

function makeVaultService(notes: Note[]) {
  return { getAllNotes: vi.fn(() => notes) } as any
}

describe('generateProjectSummary', () => {
  beforeEach(() => {
    invalidateProjectSummaryCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns projects from the specified folder only', () => {
    const notes = [
      makeNote({ path: 'Projects/alpha.md', title: 'Alpha' }),
      makeNote({ path: 'Projects/beta.md', title: 'Beta' }),
      makeNote({ path: 'Daily/2026-04-09.md', title: 'Daily' }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    const names = result.projects.map(p => p.name)
    expect(names).toContain('Alpha')
    expect(names).toContain('Beta')
    expect(names).not.toContain('Daily')
  })

  it('excludes notes outside the folder', () => {
    const notes = [
      makeNote({ path: 'Projects/inside.md', title: 'Inside' }),
      makeNote({ path: 'Archive/old.md', title: 'Old' }),
      makeNote({ path: 'root-note.md', title: 'Root' }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects).toHaveLength(1)
    expect(result.projects[0].name).toBe('Inside')
  })

  it('handles folder path with trailing slash', () => {
    const notes = [
      makeNote({ path: 'Projects/a.md', title: 'A' }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects/')

    expect(result.projects).toHaveLength(1)
    expect(result.projects[0].name).toBe('A')
  })

  it('returns empty projects for empty vault', () => {
    const vault = makeVaultService([])

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects).toEqual([])
    expect(result.generatedAt).toBeTruthy()
  })

  it('returns empty projects when no notes match the folder', () => {
    const notes = [
      makeNote({ path: 'Other/note.md', title: 'Other' }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects).toEqual([])
  })

  it('limits results to 8 most recent projects', () => {
    const notes = Array.from({ length: 12 }, (_, i) =>
      makeNote({
        path: `Projects/project-${i}.md`,
        title: `Project ${i}`,
        lastModified: new Date(2026, 3, i + 1).toISOString(),
      }),
    )
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects).toHaveLength(8)
  })

  it('sorts projects by lastModified descending', () => {
    const notes = [
      makeNote({ path: 'Projects/old.md', title: 'Old', lastModified: '2026-01-01T00:00:00Z' }),
      makeNote({ path: 'Projects/new.md', title: 'New', lastModified: '2026-04-08T00:00:00Z' }),
      makeNote({ path: 'Projects/mid.md', title: 'Mid', lastModified: '2026-03-01T00:00:00Z' }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].name).toBe('New')
    expect(result.projects[1].name).toBe('Mid')
    expect(result.projects[2].name).toBe('Old')
  })
})

describe('status extraction', () => {
  beforeEach(() => {
    invalidateProjectSummaryCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('extracts status from frontmatter-style status line', () => {
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: '---\nstatus: In Progress\n---\nSome content',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].status).toBe('In Progress')
  })

  it('derives status from todo counts when no status field', () => {
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: '- [x] Done task\n- [ ] Open task\n- [x] Another done',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].status).toBe('2/3 tasks done')
  })

  it('returns Active when no status and no todos', () => {
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: 'Just some plain text',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].status).toBe('Active')
  })
})

describe('lastActivity extraction', () => {
  beforeEach(() => {
    invalidateProjectSummaryCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses last checked todo as last activity', () => {
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: '- [x] First done\n- [x] Second done',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].lastActivity).toBe('Second done')
  })

  it('falls back to Updated today when modified today and no checked todos', () => {
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: 'No todos here',
        lastModified: '2026-04-09T10:00:00Z',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].lastActivity).toBe('Updated today')
  })

  it('shows Updated yesterday for one day old notes', () => {
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: 'No todos',
        lastModified: '2026-04-08T10:00:00Z',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].lastActivity).toBe('Updated yesterday')
  })

  it('shows Updated Nd ago for older notes', () => {
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: 'No todos',
        lastModified: '2026-04-02T10:00:00Z',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].lastActivity).toBe('Updated 7d ago')
  })

  it('truncates long checked todo text to 60 characters', () => {
    const longText = 'A'.repeat(80)
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: `- [x] ${longText}`,
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].lastActivity.length).toBeLessThanOrEqual(60)
  })
})

describe('nextAction extraction', () => {
  beforeEach(() => {
    invalidateProjectSummaryCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('extracts first unchecked todo as next action', () => {
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: '- [x] Done\n- [ ] First open\n- [ ] Second open',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].nextAction).toBe('First open')
  })

  it('returns No open tasks when all todos are checked', () => {
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: '- [x] Done\n- [x] Also done',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].nextAction).toBe('No open tasks')
  })

  it('returns No open tasks when there are no todos at all', () => {
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: 'Just plain text',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].nextAction).toBe('No open tasks')
  })

  it('truncates long next action to 60 characters', () => {
    const longText = 'B'.repeat(80)
    const notes = [
      makeNote({
        path: 'Projects/a.md',
        title: 'A',
        content: `- [ ] ${longText}`,
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].nextAction.length).toBeLessThanOrEqual(60)
  })
})

describe('stale detection', () => {
  beforeEach(() => {
    invalidateProjectSummaryCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('marks projects older than 14 days as stale', () => {
    const notes = [
      makeNote({
        path: 'Projects/stale.md',
        title: 'Stale',
        lastModified: '2026-03-20T00:00:00Z',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].isStale).toBe(true)
  })

  it('does not mark projects within 14 days as stale', () => {
    const notes = [
      makeNote({
        path: 'Projects/fresh.md',
        title: 'Fresh',
        lastModified: '2026-04-01T00:00:00Z',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].isStale).toBe(false)
  })

  it('does not mark projects exactly 14 days old as stale', () => {
    const notes = [
      makeNote({
        path: 'Projects/borderline.md',
        title: 'Borderline',
        lastModified: '2026-03-26T12:00:00Z',
      }),
    ]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].isStale).toBe(false)
  })
})

describe('daily caching', () => {
  beforeEach(() => {
    invalidateProjectSummaryCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns cached result on same day', () => {
    vi.setSystemTime(new Date('2026-04-09T08:00:00Z'))
    const notes = [makeNote({ path: 'Projects/a.md', title: 'A' })]
    const vault = makeVaultService(notes)

    generateProjectSummary(vault, 'Projects')
    expect(vault.getAllNotes).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-04-09T20:00:00Z'))
    generateProjectSummary(vault, 'Projects')
    expect(vault.getAllNotes).toHaveBeenCalledTimes(1)
  })

  it('regenerates on a new day', () => {
    vi.setSystemTime(new Date('2026-04-09T08:00:00Z'))
    const notes = [makeNote({ path: 'Projects/a.md', title: 'A' })]
    const vault = makeVaultService(notes)

    generateProjectSummary(vault, 'Projects')
    expect(vault.getAllNotes).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-04-10T08:00:00Z'))
    generateProjectSummary(vault, 'Projects')
    expect(vault.getAllNotes).toHaveBeenCalledTimes(2)
  })
})

describe('invalidateProjectSummaryCache', () => {
  beforeEach(() => {
    invalidateProjectSummaryCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('forces regeneration after invalidation', () => {
    const notes = [makeNote({ path: 'Projects/a.md', title: 'A' })]
    const vault = makeVaultService(notes)

    generateProjectSummary(vault, 'Projects')
    expect(vault.getAllNotes).toHaveBeenCalledTimes(1)

    invalidateProjectSummaryCache()
    generateProjectSummary(vault, 'Projects')
    expect(vault.getAllNotes).toHaveBeenCalledTimes(2)
  })
})

describe('name fallback', () => {
  beforeEach(() => {
    invalidateProjectSummaryCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses title when available', () => {
    const notes = [makeNote({ path: 'Projects/a.md', title: 'My Title' })]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].name).toBe('My Title')
  })

  it('falls back to filename without extension when title is empty', () => {
    const notes = [makeNote({ path: 'Projects/my-project.md', title: '' })]
    const vault = makeVaultService(notes)

    const result = generateProjectSummary(vault, 'Projects')

    expect(result.projects[0].name).toBe('my-project')
  })
})
