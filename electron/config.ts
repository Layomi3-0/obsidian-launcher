import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export type AIProvider = 'gemini' | 'claude'

export interface AppConfig {
  vaultPath: string
  apiKey: string
  provider: AIProvider
  onboarded: boolean
  kanbanEnabled: boolean
  kanbanPath: string
  projectsFolder: string
}

const CONFIG_DIR = join(homedir(), '.quick-launcher')
const CONFIG_PATH = join(CONFIG_DIR, 'config.toml')

export function loadConfig(): AppConfig {
  ensureConfigDir()

  const envVaultPath = process.env.VAULT_PATH || ''
  const envApiKey = process.env.GEMINI_API_KEY || ''

  if (!existsSync(CONFIG_PATH)) {
    const config: AppConfig = {
      vaultPath: envVaultPath,
      apiKey: envApiKey,
      provider: 'claude',
      onboarded: false,
      kanbanEnabled: false,
      kanbanPath: '',
      projectsFolder: 'Projects',
    }
    writeDefaultConfig(config)
    return config
  }

  const content = readFileSync(CONFIG_PATH, 'utf-8')
  const vaultPath = envVaultPath || matchValue(content, 'vault_path')
  const geminiKey = envApiKey || matchValue(content, 'gemini_api_key')
  const anthropicKey = process.env.ANTHROPIC_API_KEY || matchValue(content, 'anthropic_api_key')
  const providerRaw = matchValue(content, 'provider')
  const provider: AIProvider = detectProvider(providerRaw, geminiKey, anthropicKey)
  const apiKey = provider === 'claude' ? anthropicKey : geminiKey
  const onboardedRaw = matchValue(content, 'onboarded')
  const kanbanEnabled = matchValue(content, 'kanban_enabled') === 'true'
  const kanbanPath = matchValue(content, 'kanban_path') || ''

  // Auto-detect onboarded: if vault and key exist but no onboarded flag, consider onboarded
  const hasKey = geminiKey !== '' || anthropicKey !== ''
  const onboarded = onboardedRaw === 'true' || (onboardedRaw === '' && vaultPath !== '' && hasKey)

  const projectsFolder = matchValue(content, 'projects_folder') || 'Projects'

  return { vaultPath, apiKey, provider, onboarded, kanbanEnabled, kanbanPath, projectsFolder }
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir()

  // Preserve existing config content, only update known fields
  let content = existsSync(CONFIG_PATH) ? readFileSync(CONFIG_PATH, 'utf-8') : ''

  content = upsertValue(content, 'vault_path', config.vaultPath)
  content = upsertValue(content, 'provider', config.provider)
  if (config.provider === 'claude') {
    content = upsertValue(content, 'anthropic_api_key', config.apiKey)
  } else {
    content = upsertValue(content, 'gemini_api_key', config.apiKey)
  }
  content = upsertValue(content, 'onboarded', String(config.onboarded))
  content = upsertValue(content, 'kanban_enabled', String(config.kanbanEnabled))
  content = upsertValue(content, 'kanban_path', config.kanbanPath)
  content = upsertValue(content, 'projects_folder', config.projectsFolder)

  writeFileSync(CONFIG_PATH, content, 'utf-8')
}

function detectProvider(providerRaw: string, geminiKey: string, anthropicKey: string): AIProvider {
  if (providerRaw === 'gemini') return 'gemini'
  if (providerRaw === 'claude') return 'claude'
  // No explicit provider set — infer from which key exists
  if (geminiKey && !anthropicKey) return 'gemini'
  return 'claude'
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
}

function matchValue(content: string, key: string): string {
  const match = content.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`, 'm'))
  return match?.[1] ?? ''
}

function upsertValue(content: string, key: string, value: string): string {
  const regex = new RegExp(`(${key}\\s*=\\s*)"[^"]*"`, 'm')
  if (regex.test(content)) {
    return content.replace(regex, `$1"${value}"`)
  }

  // Append to [general] section if it exists, otherwise append at end
  if (content.includes('[general]')) {
    return content.replace('[general]', `[general]\n${key} = "${value}"`)
  }
  return content + `\n${key} = "${value}"\n`
}

function writeDefaultConfig(config: AppConfig): void {
  const content = `[general]
vault_path = "${config.vaultPath}"
hotkey = "Control+Alt+Space"
theme = "dark"
onboarded = "${config.onboarded}"
kanban_enabled = "${config.kanbanEnabled}"
kanban_path = "${config.kanbanPath}"

[ai]
gemini_api_key = "${config.apiKey}"
model = "gemini-2.5-pro"
max_tokens = 2048
temperature = 0.7
`
  writeFileSync(CONFIG_PATH, content, 'utf-8')
}
