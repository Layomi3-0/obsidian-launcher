import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export interface AppConfig {
  vaultPath: string
  apiKey: string
}

export function loadConfig(): AppConfig {
  const configDir = join(homedir(), '.quick-launcher')
  const configPath = join(configDir, 'config.toml')

  let vaultPath = process.env.VAULT_PATH || ''
  let apiKey = process.env.GEMINI_API_KEY || ''

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8')
    if (!vaultPath) {
      const match = content.match(/vault_path\s*=\s*"([^"]+)"/)
      vaultPath = match?.[1] ?? ''
    }
    if (!apiKey) {
      const match = content.match(/gemini_api_key\s*=\s*"([^"]+)"/)
      apiKey = match?.[1] ?? ''
    }
  }

  // Create default config if it doesn't exist
  if (!existsSync(configPath)) {
    if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true })
    writeFileSync(configPath, `[general]\nvault_path = "${vaultPath}"\nhotkey = "Control+Alt+Space"\ntheme = "dark"\n\n[ai]\ngemini_api_key = "${apiKey}"\nmodel = "gemini-3.1-pro"\nmax_tokens = 2048\ntemperature = 0.7\n`, 'utf-8')
  }

  return { vaultPath, apiKey }
}
