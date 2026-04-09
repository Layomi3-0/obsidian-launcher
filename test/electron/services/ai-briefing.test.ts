// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: { fetchTranscript: vi.fn() },
}))

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

import { buildMapMessage, buildReduceMessage, stripCodeFences } from '../../../electron/services/ai-briefing'
import type { ProjectManifestEntry, ProjectSummary } from '../../../electron/services/ai-briefing'

function makeEntry(overrides: Partial<ProjectManifestEntry> = {}): ProjectManifestEntry {
  return {
    title: 'Test Project',
    path: 'Projects/Test Project.md',
    content: '# Test\nSome content',
    todos: [],
    done: [],
    lastModified: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

function makeSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    title: 'Test Project',
    path: 'Projects/Test Project.md',
    status: 'Active',
    lastActivity: 'Updated docs',
    nextAction: 'Write tests',
    blockers: [],
    openTodos: [],
    isStale: false,
    ...overrides,
  }
}

describe('buildMapMessage', () => {
  it('includes title, path, modified date, and content', () => {
    const result = buildMapMessage(makeEntry())

    expect(result).toContain('Project: Test Project')
    expect(result).toContain('Path: Projects/Test Project.md')
    expect(result).toContain('Last modified: 2026-03-01T00:00:00Z')
    expect(result).toContain('Content:\n# Test\nSome content')
  })

  it('appends open todos when present', () => {
    const result = buildMapMessage(makeEntry({ todos: ['Fix bug', 'Add tests'] }))

    expect(result).toContain('Open TODOs:')
    expect(result).toContain('- [ ] Fix bug')
    expect(result).toContain('- [ ] Add tests')
  })

  it('appends completed items when present', () => {
    const result = buildMapMessage(makeEntry({ done: ['Setup CI'] }))

    expect(result).toContain('Recently completed:')
    expect(result).toContain('- [x] Setup CI')
  })

  it('omits todo sections when empty', () => {
    const result = buildMapMessage(makeEntry())

    expect(result).not.toContain('Open TODOs')
    expect(result).not.toContain('Recently completed')
  })
})

describe('buildReduceMessage', () => {
  it('includes header with project counts', () => {
    const result = buildReduceMessage([makeSummary()], 1, '> briefing', '')

    expect(result).toContain('Pre-Extracted Project Summaries (1 of 1 projects)')
    expect(result).toContain('Synthesize into a briefing')
  })

  it('formats each summary with status, activity, and next action', () => {
    const result = buildReduceMessage([makeSummary()], 1, 'briefing', '')

    expect(result).toContain('### 1. [[Test Project]]')
    expect(result).toContain('**Status**: Active')
    expect(result).toContain('**Last activity**: Updated docs')
    expect(result).toContain('**Next action**: Write tests')
  })

  it('includes blockers when present', () => {
    const result = buildReduceMessage(
      [makeSummary({ blockers: ['Waiting on API key'] })],
      1, 'briefing', '',
    )

    expect(result).toContain('**Blockers**: Waiting on API key')
  })

  it('formats open todos with overflow indicator', () => {
    const todos = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const result = buildReduceMessage(
      [makeSummary({ openTodos: todos })],
      1, 'briefing', '',
    )

    expect(result).toContain('**Open TODOs** (7)')
    expect(result).toContain('(+2 more)')
  })

  it('marks stale projects', () => {
    const result = buildReduceMessage(
      [makeSummary({ isStale: true })],
      1, 'briefing', '',
    )

    expect(result).toContain('⚠ STALE')
  })

  it('includes recent history when provided', () => {
    const result = buildReduceMessage([makeSummary()], 1, 'briefing', 'prior question')

    expect(result).toContain('Recent queries this session')
    expect(result).toContain('prior question')
  })

  it('omits history section when empty', () => {
    const result = buildReduceMessage([makeSummary()], 1, 'briefing', '')

    expect(result).not.toContain('Recent queries this session')
  })

  it('strips query prefix and includes verification instruction', () => {
    const result = buildReduceMessage([makeSummary()], 3, '> daily briefing', '')

    expect(result).toContain('## Instruction\ndaily briefing')
    expect(result).toContain('MUST cover ALL 3 projects')
    expect(result).toContain('Verification: 3/3 projects covered')
  })

  it('numbers multiple summaries sequentially', () => {
    const summaries = [
      makeSummary({ title: 'Alpha' }),
      makeSummary({ title: 'Beta' }),
    ]
    const result = buildReduceMessage(summaries, 2, 'briefing', '')

    expect(result).toContain('### 1. [[Alpha]]')
    expect(result).toContain('### 2. [[Beta]]')
  })
})

describe('stripCodeFences', () => {
  it('removes ```json fences wrapping valid JSON', () => {
    const input = '```json\n{"status": "Active"}\n```'
    expect(stripCodeFences(input)).toBe('{"status": "Active"}')
  })

  it('removes plain ``` fences without language tag', () => {
    const input = '```\n{"status": "Active"}\n```'
    expect(stripCodeFences(input)).toBe('{"status": "Active"}')
  })

  it('returns plain JSON unchanged', () => {
    const input = '{"status": "Active"}'
    expect(stripCodeFences(input)).toBe('{"status": "Active"}')
  })

  it('handles fences with extra whitespace', () => {
    const input = '```json  \n{"status": "Active"}\n```  '
    expect(stripCodeFences(input)).toBe('{"status": "Active"}')
  })

  it('produces parseable JSON from fenced input', () => {
    const input = '```json\n{"status":"Active","blockers":[],"isStale":false}\n```'
    const result = stripCodeFences(input)
    const parsed = JSON.parse(result)
    expect(parsed.status).toBe('Active')
    expect(parsed.blockers).toEqual([])
  })
})
