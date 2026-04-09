import { ipcMain, dialog, BrowserWindow } from 'electron'
import { loadConfig, saveConfig } from './config'
import type { AppConfig } from './config'

export function registerConfigHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('config:get', async () => loadConfig())

  ipcMain.handle('config:save', async (_event, settings: AppConfig) => {
    try {
      saveConfig(settings)
      return { success: true }
    } catch (err) {
      console.error('[config:save]', err)
      return { success: false }
    }
  })

  ipcMain.handle('config:pick-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select your Obsidian vault folder',
      buttonLabel: 'Select Vault',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('config:validate-key', async (_event, key: string, provider: string) => {
    return validateApiKey(key, provider)
  })
}

async function validateApiKey(key: string, provider: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (provider === 'claude') {
      await validateClaudeKey(key)
    } else {
      await validateGeminiKey(key)
    }
    return { valid: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid API key'
    return { valid: false, error: message }
  }
}

async function validateClaudeKey(key: string): Promise<void> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: key })
  await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Say ok' }],
  })
}

async function validateGeminiKey(key: string): Promise<void> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  await model.generateContent('Say "ok"')
}
