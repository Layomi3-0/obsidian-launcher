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
import { loadConfig } from '../../electron/config'

describe('loadConfig', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    savedEnv.VAULT_PATH = process.env.VAULT_PATH
    savedEnv.GEMINI_API_KEY = process.env.GEMINI_API_KEY
    delete process.env.VAULT_PATH
    delete process.env.GEMINI_API_KEY
  })

  afterEach(() => {
    if (savedEnv.VAULT_PATH !== undefined) process.env.VAULT_PATH = savedEnv.VAULT_PATH
    else delete process.env.VAULT_PATH
    if (savedEnv.GEMINI_API_KEY !== undefined) process.env.GEMINI_API_KEY = savedEnv.GEMINI_API_KEY
    else delete process.env.GEMINI_API_KEY
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
      'vault_path = "/from/config"\ngemini_api_key = "config-key"' as any
    )

    const config = loadConfig()

    expect(config.vaultPath).toBe('/from/config')
    expect(config.apiKey).toBe('config-key')
  })

  it('env vars take precedence over config file', () => {
    process.env.VAULT_PATH = '/env/vault'
    process.env.GEMINI_API_KEY = 'env-key'
    mockExistsSync.mockReturnValue(true as any)
    mockReadFileSync.mockReturnValue(
      'vault_path = "/config/vault"\ngemini_api_key = "config-key"' as any
    )

    const config = loadConfig()

    expect(config.vaultPath).toBe('/env/vault')
    expect(config.apiKey).toBe('env-key')
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
      expect.stringContaining('.quick-launcher'),
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
})
