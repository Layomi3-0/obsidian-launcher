// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn(),
  },
}))

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

vi.mock('../../../electron/services/ai-tools-kanban', () => ({
  executeKanbanTool: vi.fn().mockReturnValue(null),
}))

import { executeTool, getClaudeTools, getGeminiTools } from '../../../electron/services/ai-tools'
import { TOOL_DEFS } from '../../../electron/services/ai-tools-defs'
import { executeKanbanTool } from '../../../electron/services/ai-tools-kanban'

const mockKanbanTool = vi.mocked(executeKanbanTool)

function createMockCLI() {
  return {
    createNote: vi.fn().mockResolvedValue(true),
    overwriteNote: vi.fn().mockResolvedValue({ success: true, path: 'notes/test.md' }),
    appendToNote: vi.fn().mockResolvedValue(true),
    dailyAppend: vi.fn().mockResolvedValue(true),
    readNote: vi.fn().mockResolvedValue('note content here'),
    moveNote: vi.fn().mockResolvedValue(true),
    search: vi.fn().mockResolvedValue([{ path: 'a.md' }, { path: 'b.md' }]),
    isAvailable: vi.fn().mockReturnValue(true),
  }
}

describe('executeTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns displayMessage defaulting to message when not set', async () => {
    const cli = createMockCLI()
    const result = await executeTool('create_note', { name: 'Test', content: 'Hello' }, cli as any)

    expect(result.success).toBe(true)
    expect(result.displayMessage).toBe(result.message)
    expect(result.message).toContain('Created [[Test]]')
  })

  it('returns custom displayMessage for read_note', async () => {
    const cli = createMockCLI()
    const result = await executeTool('read_note', { name: 'My Note' }, cli as any)

    expect(result.success).toBe(true)
    expect(result.message).toBe('note content here')
    expect(result.displayMessage).toBe('Read [[My Note]]')
    expect(result.displayMessage).not.toBe(result.message)
  })

  it('returns custom displayMessage for search_vault', async () => {
    const cli = createMockCLI()
    const result = await executeTool('search_vault', { query: 'test' }, cli as any)

    expect(result.success).toBe(true)
    expect(result.message).toContain('Found 2 results')
    expect(result.message).toContain('a.md')
    expect(result.displayMessage).toBe('Found 2 results')
  })

  it('returns error for unknown tool', async () => {
    mockKanbanTool.mockReturnValue(null)
    const result = await executeTool('nonexistent_tool', {}, null)

    expect(result.success).toBe(false)
    expect(result.message).toContain('Unknown tool')
  })

  it('returns error for vault tool when CLI is null', async () => {
    const result = await executeTool('create_note', { name: 'X', content: 'Y' }, null)

    expect(result.success).toBe(false)
    expect(result.message).toContain('Obsidian CLI is not available')
  })

  it('handles create_note failure', async () => {
    const cli = createMockCLI()
    cli.createNote.mockResolvedValue(false)
    const result = await executeTool('create_note', { name: 'Dup', content: 'X' }, cli as any)

    expect(result.success).toBe(false)
    expect(result.message).toContain('Failed to create')
  })

  it('handles edit_note success', async () => {
    const cli = createMockCLI()
    const result = await executeTool('edit_note', { name: 'Existing', content: 'Updated' }, cli as any)

    expect(result.success).toBe(true)
    expect(result.message).toContain('Updated [[Existing]]')
  })

  it('handles append_to_note', async () => {
    const cli = createMockCLI()
    const result = await executeTool('append_to_note', { name: 'Log', content: 'Entry' }, cli as any)

    expect(result.success).toBe(true)
    expect(result.message).toContain('Appended to [[Log]]')
  })

  it('handles append_to_daily', async () => {
    const cli = createMockCLI()
    const result = await executeTool('append_to_daily', { content: 'Quick thought' }, cli as any)

    expect(result.success).toBe(true)
    expect(result.message).toContain('Appended to daily note')
  })

  it('handles move_note', async () => {
    const cli = createMockCLI()
    const result = await executeTool('move_note', { name: 'Old', to: 'Archives/' }, cli as any)

    expect(result.success).toBe(true)
    expect(result.message).toContain('Moved "Old" to Archives/')
  })

  it('handles read_note not found', async () => {
    const cli = createMockCLI()
    cli.readNote.mockResolvedValue(null)
    const result = await executeTool('read_note', { name: 'Ghost' }, cli as any)

    expect(result.success).toBe(false)
    expect(result.message).toContain('not found')
  })

  it('handles search_vault with no results', async () => {
    const cli = createMockCLI()
    cli.search.mockResolvedValue([])
    const result = await executeTool('search_vault', { query: 'xyz' }, cli as any)

    expect(result.success).toBe(true)
    expect(result.displayMessage).toBe('No results found')
  })

  it('delegates to kanban tool for kanban_* names', async () => {
    mockKanbanTool.mockReturnValue({
      name: 'kanban_board',
      success: true,
      message: 'Board loaded',
      displayMessage: 'Loaded board',
    })
    const result = await executeTool('kanban_board', {}, null)

    expect(result.success).toBe(true)
    expect(result.displayMessage).toBe('Loaded board')
  })

  it('handles create_note with folder', async () => {
    const cli = createMockCLI()
    const result = await executeTool('create_note', { name: 'Test', content: 'X', folder: 'Projects/' }, cli as any)

    expect(result.message).toContain('in Projects/')
    expect(cli.createNote).toHaveBeenCalledWith('Test', 'X', 'Projects/')
  })
})

describe('getClaudeTools', () => {
  it('returns tools in Claude format with input_schema', () => {
    const tools = getClaudeTools()

    expect(tools.length).toBeGreaterThan(0)
    for (const tool of tools) {
      expect(tool).toHaveProperty('name')
      expect(tool).toHaveProperty('description')
      expect(tool).toHaveProperty('input_schema')
      expect(tool.input_schema.type).toBe('object')
      expect(tool.input_schema).toHaveProperty('properties')
      expect(tool.input_schema).toHaveProperty('required')
    }
  })

  it('includes all tools when includeVault is true', () => {
    const all = getClaudeTools(true)
    const vaultTools = TOOL_DEFS.filter(t => t.requiresVault)
    const vaultNames = vaultTools.map(t => t.name)

    for (const name of vaultNames) {
      expect(all.find(t => t.name === name)).toBeDefined()
    }
  })

  it('excludes vault tools when includeVault is false', () => {
    const filtered = getClaudeTools(false)
    const vaultToolNames = TOOL_DEFS.filter(t => t.requiresVault).map(t => t.name)

    for (const name of vaultToolNames) {
      expect(filtered.find(t => t.name === name)).toBeUndefined()
    }
  })
})

describe('getGeminiTools', () => {
  it('returns tools in Gemini format with functionDeclarations', () => {
    const tools = getGeminiTools()

    expect(tools.length).toBe(1)
    expect(tools[0]).toHaveProperty('functionDeclarations')
    expect(tools[0].functionDeclarations.length).toBeGreaterThan(0)

    for (const decl of tools[0].functionDeclarations) {
      expect(decl).toHaveProperty('name')
      expect(decl).toHaveProperty('description')
      expect(decl.parameters.type).toBe('OBJECT')
    }
  })

  it('excludes vault tools when includeVault is false', () => {
    const tools = getGeminiTools(false)
    const names = tools[0].functionDeclarations.map((d: any) => d.name)
    const vaultToolNames = TOOL_DEFS.filter(t => t.requiresVault).map(t => t.name)

    for (const name of vaultToolNames) {
      expect(names).not.toContain(name)
    }
  })
})
