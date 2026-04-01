// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock(import('fs'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
  }
})

import { readFileSync, existsSync } from 'fs'
import { loadAIConfig, matchConfig, formatNoteChunk, buildUserMessage } from '../../../electron/services/ai-helpers'

const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)

describe('loadAIConfig', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    savedEnv.GEMINI_API_KEY = process.env.GEMINI_API_KEY
    savedEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    delete process.env.GEMINI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
  })

  afterEach(() => {
    if (savedEnv.GEMINI_API_KEY !== undefined) process.env.GEMINI_API_KEY = savedEnv.GEMINI_API_KEY
    else delete process.env.GEMINI_API_KEY
    if (savedEnv.ANTHROPIC_API_KEY !== undefined) process.env.ANTHROPIC_API_KEY = savedEnv.ANTHROPIC_API_KEY
    else delete process.env.ANTHROPIC_API_KEY
  })

  it('returns defaults when no config file exists', () => {
    mockExistsSync.mockReturnValue(false)

    const config = loadAIConfig()

    expect(config.provider).toBe('gemini')
    expect(config.geminiModel).toBe('gemini-2.5-pro')
    expect(config.geminiModelFast).toBe('gemini-2.5-flash')
    expect(config.anthropicModel).toBe('claude-opus-4-6')
    expect(config.anthropicModelFast).toBe('claude-haiku-4-5-20251001')
    expect(config.geminiApiKey).toBe('')
    expect(config.anthropicApiKey).toBe('')
  })

  it('uses env vars for API keys when set', () => {
    mockExistsSync.mockReturnValue(false)
    process.env.GEMINI_API_KEY = 'env-gemini-key'
    process.env.ANTHROPIC_API_KEY = 'env-anthropic-key'

    const config = loadAIConfig()

    expect(config.geminiApiKey).toBe('env-gemini-key')
    expect(config.anthropicApiKey).toBe('env-anthropic-key')
  })

  it('parses config file values', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue(
      ('provider = "claude"\n' +
      'gemini_api_key = "file-gemini"\n' +
      'gemini_model = "gemini-custom"\n' +
      'anthropic_api_key = "file-anthropic"\n' +
      'anthropic_model = "claude-custom"\n') as any
    )

    const config = loadAIConfig()

    expect(config.provider).toBe('claude')
    expect(config.geminiApiKey).toBe('file-gemini')
    expect(config.geminiModel).toBe('gemini-custom')
    expect(config.anthropicApiKey).toBe('file-anthropic')
    expect(config.anthropicModel).toBe('claude-custom')
  })

  it('config file API key takes precedence over env var', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue('gemini_api_key = "file-key"\n' as any)
    process.env.GEMINI_API_KEY = 'env-key'

    const config = loadAIConfig()

    expect(config.geminiApiKey).toBe('file-key')
  })

  it('falls back to defaults on config file read error', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockImplementation(() => { throw new Error('read error') })

    const config = loadAIConfig()

    expect(config.provider).toBe('gemini')
    expect(config.geminiModel).toBe('gemini-2.5-pro')
  })

  it('defaults provider to gemini for unrecognized values', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue('provider = "openai"\n' as any)

    const config = loadAIConfig()

    expect(config.provider).toBe('gemini')
  })
})

describe('matchConfig', () => {
  it('extracts a quoted value for a given key', () => {
    const content = 'model = "gemini-pro"\napi_key = "abc123"'
    expect(matchConfig(content, 'model')).toBe('gemini-pro')
    expect(matchConfig(content, 'api_key')).toBe('abc123')
  })

  it('returns empty string when key not found', () => {
    expect(matchConfig('foo = "bar"', 'missing_key')).toBe('')
  })

  it('handles spaces around equals sign', () => {
    expect(matchConfig('key   =   "value"', 'key')).toBe('value')
  })

  it('handles empty quoted value', () => {
    expect(matchConfig('key = ""', 'key')).toBe('')
  })
})

describe('formatNoteChunk', () => {
  it('formats note with title, path, and body', () => {
    const result = formatNoteChunk('notes/test.md', 'Test Note', 'Body text here')

    expect(result).toBe('[[Test Note]] (notes/test.md):\nBody text here')
  })

  it('strips frontmatter from content', () => {
    const content = '---\ntitle: Foo\ntags: [a]\n---\nActual body text'
    const result = formatNoteChunk('a.md', 'Foo', content)

    expect(result).not.toContain('---')
    expect(result).not.toContain('tags:')
    expect(result).toContain('Actual body text')
  })

  it('truncates body to 2000 characters', () => {
    const longBody = 'x'.repeat(3000)
    const result = formatNoteChunk('a.md', 'Long', longBody)

    const bodyPart = result.split(':\n')[1]
    expect(bodyPart.length).toBeLessThanOrEqual(2000)
  })
})

describe('buildUserMessage', () => {
  it('includes all sections when all data is present', () => {
    const result = buildUserMessage(
      '> what is this about',
      ['[[Note A]] (a.md):\ncontent A'],
      'Previous query: something',
      'current-note',
    )

    expect(result).toContain('## Relevant vault context')
    expect(result).toContain('content A')
    expect(result).toContain('## Recent queries this session')
    expect(result).toContain('Previous query: something')
    expect(result).toContain('## Currently viewing')
    expect(result).toContain('[[current-note]]')
    expect(result).toContain('## Query')
    expect(result).toContain('what is this about')
  })

  it('omits vault context when no chunks provided', () => {
    const result = buildUserMessage('> hello', [], '', null)

    expect(result).not.toContain('## Relevant vault context')
    expect(result).toContain('## Query')
    expect(result).toContain('hello')
  })

  it('omits recent history when empty', () => {
    const result = buildUserMessage('> test', [], '', null)

    expect(result).not.toContain('## Recent queries')
  })

  it('omits currently viewing when lastNoteOpened is null', () => {
    const result = buildUserMessage('> test', [], '', null)

    expect(result).not.toContain('## Currently viewing')
  })

  it('strips > prefix from query', () => {
    const result = buildUserMessage('> what is life', [], '', null)

    expect(result).toContain('what is life')
    expect(result).not.toContain('> what is life')
  })

  it('strips / prefix from query', () => {
    const result = buildUserMessage('/ capture this', [], '', null)

    expect(result).toContain('capture this')
  })

  it('joins context chunks with --- separator', () => {
    const result = buildUserMessage(
      '> test',
      ['chunk1', 'chunk2'],
      '',
      null,
    )

    expect(result).toContain('chunk1\n\n---\n\nchunk2')
  })
})
