// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock(import('fs'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  }
})

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)
const mockWriteFileSync = vi.mocked(writeFileSync)
const mockMkdirSync = vi.mocked(mkdirSync)

// Must import AFTER mocks are set up
import { loadConfig, saveConfig } from '../../electron/config'

describe('loadConfig', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    savedEnv.VAULT_PATH = process.env.VAULT_PATH
    savedEnv.GEMINI_API_KEY = process.env.GEMINI_API_KEY
    savedEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    delete process.env.VAULT_PATH
    delete process.env.GEMINI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
  })

  afterEach(() => {
    if (savedEnv.VAULT_PATH !== undefined) process.env.VAULT_PATH = savedEnv.VAULT_PATH
    else delete process.env.VAULT_PATH
    if (savedEnv.GEMINI_API_KEY !== undefined) process.env.GEMINI_API_KEY = savedEnv.GEMINI_API_KEY
    else delete process.env.GEMINI_API_KEY
    if (savedEnv.ANTHROPIC_API_KEY !== undefined) process.env.ANTHROPIC_API_KEY = savedEnv.ANTHROPIC_API_KEY
    else delete process.env.ANTHROPIC_API_KEY
  })

  it('returns empty strings when no env vars and no config file', () => {
    mockExistsSync.mockReturnValue(false)

    const config = loadConfig()

    expect(config.vaultPath).toBe('')
    expect(config.apiKey).toBe('')
  })

  it('uses VAULT_PATH and GEMINI_API_KEY from env vars', () => {
    process.env.VAULT_PATH = '/my/vault'
    process.env.GEMINI_API_KEY = 'my-api-key'
    mockExistsSync.mockReturnValue(false)

    const config = loadConfig()

    expect(config.vaultPath).toBe('/my/vault')
    expect(config.apiKey).toBe('my-api-key')
  })

  it('parses vault_path from config file when env var not set', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue(
      'vault_path = "/from/config"\nprovider = "gemini"\ngemini_api_key = "config-key"' as any
    )

    const config = loadConfig()

    expect(config.vaultPath).toBe('/from/config')
    expect(config.apiKey).toBe('config-key')
    expect(config.provider).toBe('gemini')
  })

  it('env vars take precedence over config file', () => {
    process.env.VAULT_PATH = '/env/vault'
    process.env.GEMINI_API_KEY = 'env-key'
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue(
      'vault_path = "/config/vault"\nprovider = "gemini"\ngemini_api_key = "config-key"' as any
    )

    const config = loadConfig()

    expect(config.vaultPath).toBe('/env/vault')
    expect(config.apiKey).toBe('env-key')
    expect(config.onboarded).toBe(true)
  })

  it('creates default config file when it does not exist', () => {
    mockExistsSync.mockReturnValue(false)

    loadConfig()

    expect(mockWriteFileSync).toHaveBeenCalledOnce()
    const writtenContent = (mockWriteFileSync.mock.calls[0] as any)[1] as string
    expect(writtenContent).toContain('vault_path')
    expect(writtenContent).toContain('gemini_api_key')
    expect(writtenContent).toContain('hotkey')
  })

  it('creates config directory if it does not exist', () => {
    mockExistsSync.mockReturnValue(false)

    loadConfig()

    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.brain-dump'),
      { recursive: true },
    )
  })

  it('does not overwrite existing config file', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue('vault_path = "/existing"' as any)

    loadConfig()

    expect(mockWriteFileSync).not.toHaveBeenCalled()
  })

  it('includes env var values in created config file', () => {
    process.env.VAULT_PATH = '/my/vault'
    process.env.GEMINI_API_KEY = 'my-key'
    mockExistsSync.mockReturnValue(false)

    loadConfig()

    const writtenContent = (mockWriteFileSync.mock.calls[0] as any)[1] as string
    expect(writtenContent).toContain('/my/vault')
    expect(writtenContent).toContain('my-key')
  })

  it('defaults provider to claude when no provider and no gemini key', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue('vault_path = "/vault"' as any)

    const config = loadConfig()

    expect(config.provider).toBe('claude')
  })

  it('infers gemini provider when no provider field but gemini key exists', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue(
      'vault_path = "/vault"\ngemini_api_key = "gkey"' as any
    )

    const config = loadConfig()

    expect(config.provider).toBe('gemini')
    expect(config.apiKey).toBe('gkey')
  })

  it('reads explicit provider from config file', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue(
      'vault_path = "/vault"\nprovider = "gemini"\ngemini_api_key = "gkey"' as any
    )

    const config = loadConfig()

    expect(config.provider).toBe('gemini')
  })

  it('defaults projectsFolder to Projects when not specified', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue('vault_path = "/vault"' as any)

    const config = loadConfig()

    expect(config.projectsFolder).toBe('Projects')
  })

  it('reads projectsFolder from config file', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue(
      'vault_path = "/vault"\nprojects_folder = "MyProjects"' as any
    )

    const config = loadConfig()

    expect(config.projectsFolder).toBe('MyProjects')
  })

  it('auto-detects onboarded when vault and anthropic key exist but no onboarded flag', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue(
      'vault_path = "/vault"\nanthropic_api_key = "akey"' as any
    )

    const config = loadConfig()

    expect(config.onboarded).toBe(true)
  })

  it('returns onboarded false when no keys exist', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue('vault_path = "/vault"' as any)

    const config = loadConfig()

    expect(config.onboarded).toBe(false)
  })

  it('reads kanbanEnabled and kanbanPath from config file', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue(
      'vault_path = "/vault"\nkanban_enabled = "true"\nkanban_path = "/vault/kanban.md"' as any
    )

    const config = loadConfig()

    expect(config.kanbanEnabled).toBe(true)
    expect(config.kanbanPath).toBe('/vault/kanban.md')
  })
})

describe('saveConfig', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    savedEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
  })

  afterEach(() => {
    if (savedEnv.ANTHROPIC_API_KEY !== undefined) process.env.ANTHROPIC_API_KEY = savedEnv.ANTHROPIC_API_KEY
    else delete process.env.ANTHROPIC_API_KEY
  })

  const baseConfig = {
    vaultPath: '/my/vault',
    apiKey: 'test-key',
    provider: 'claude' as const,
    onboarded: true,
    kanbanEnabled: false,
    kanbanPath: '',
    projectsFolder: 'Projects',
  }

  it('preserves existing config content while updating known fields', () => {
    const existing = '[general]\nvault_path = "/old/vault"\nhotkey = "Control+Alt+Space"\ntheme = "dark"'
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue(existing as any)

    saveConfig({ ...baseConfig, vaultPath: '/new/vault' })

    const written = (mockWriteFileSync.mock.calls[0] as any)[1] as string
    expect(written).toContain('vault_path = "/new/vault"')
    expect(written).toContain('hotkey = "Control+Alt+Space"')
    expect(written).toContain('theme = "dark"')
  })

  it('writes anthropic_api_key for claude provider', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue('' as any)

    saveConfig({ ...baseConfig, provider: 'claude', apiKey: 'claude-key' })

    const written = (mockWriteFileSync.mock.calls[0] as any)[1] as string
    expect(written).toContain('anthropic_api_key = "claude-key"')
    expect(written).not.toContain('gemini_api_key')
  })

  it('writes gemini_api_key for gemini provider', () => {
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue('' as any)

    saveConfig({ ...baseConfig, provider: 'gemini', apiKey: 'gemini-key' })

    const written = (mockWriteFileSync.mock.calls[0] as any)[1] as string
    expect(written).toContain('gemini_api_key = "gemini-key"')
    expect(written).not.toContain('anthropic_api_key')
  })
})
