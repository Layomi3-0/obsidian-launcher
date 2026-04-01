import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export type AIProvider = 'gemini' | 'claude'

export interface AIConfig {
  provider: AIProvider
  geminiApiKey: string
  geminiModel: string
  geminiModelFast: string
  anthropicApiKey: string
  anthropicModel: string
  anthropicModelFast: string
}

export function loadAIConfig(): AIConfig {
  const configPath = join(homedir(), '.quick-launcher', 'config.toml')
  const defaults: AIConfig = {
    provider: 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: 'gemini-2.5-pro',
    geminiModelFast: 'gemini-2.5-flash',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: 'claude-opus-4-6',
    anthropicModelFast: 'claude-haiku-4-5-20251001',
  }

  if (!existsSync(configPath)) return defaults

  try {
    const content = readFileSync(configPath, 'utf-8')

    const provider = matchConfig(content, 'provider')
    const geminiKey = matchConfig(content, 'gemini_api_key')
    const geminiModel = matchConfig(content, 'gemini_model')
    const geminiModelFast = matchConfig(content, 'gemini_model_fast')
    const anthropicKey = matchConfig(content, 'anthropic_api_key')
    const anthropicModel = matchConfig(content, 'anthropic_model')
    const anthropicModelFast = matchConfig(content, 'anthropic_model_fast')

    return {
      provider: (provider === 'claude' ? 'claude' : 'gemini') as AIProvider,
      geminiApiKey: geminiKey || defaults.geminiApiKey,
      geminiModel: geminiModel || defaults.geminiModel,
      geminiModelFast: geminiModelFast || defaults.geminiModelFast,
      anthropicApiKey: anthropicKey || defaults.anthropicApiKey,
      anthropicModel: anthropicModel || defaults.anthropicModel,
      anthropicModelFast: anthropicModelFast || defaults.anthropicModelFast,
    }
  } catch {
    return defaults
  }
}

export function matchConfig(content: string, key: string): string {
  const match = content.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`, 'm'))
  return match?.[1] ?? ''
}

export function formatNoteChunk(path: string, title: string, content: string): string {
  const body = content
    .replace(/^---[\s\S]*?---\n?/, '')
    .trim()
    .slice(0, 2000)
  return `[[${title}]] (${path}):\n${body}`
}

export function buildUserMessage(
  query: string,
  contextChunks: string[],
  recentHistory: string,
  lastNoteOpened: string | null,
): string {
  const parts: string[] = []

  if (contextChunks.length > 0) {
    parts.push('## Relevant vault context\n' + contextChunks.join('\n\n---\n\n'))
  }
  if (recentHistory) {
    parts.push('## Recent queries this session\n' + recentHistory)
  }
  if (lastNoteOpened) {
    parts.push(`## Currently viewing\n[[${lastNoteOpened}]]`)
  }

  parts.push('## Query\n' + query.replace(/^[/>]\s*/, '').trim())

  return parts.join('\n\n')
}

export const MAP_SYSTEM_PROMPT = `You are a project status extractor. Given a project note from an Obsidian vault, extract structured information.
Return ONLY valid JSON matching this schema — no markdown, no explanation, no wrapping.

{
  "status": "brief one-line status summary",
  "lastActivity": "most recent concrete action taken (from checked todos, latest headings, or most recent content)",
  "nextAction": "the single most important next step (from unchecked todos or logical continuation)",
  "blockers": ["list of blockers or open questions — empty array if none"],
  "openTodos": ["list of all unchecked todo items from the note"],
  "isStale": false
}

Rules:
- "isStale" is true if no meaningful activity in the last 14+ days based on the lastModified date.
- Be SPECIFIC in lastActivity and nextAction — quote actual task text, don't paraphrase vaguely.
- If there are no unchecked todos, set openTodos to an empty array and suggest a next action based on context.`

export const PROJECT_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', description: 'Brief one-line project status' },
    lastActivity: { type: 'string', description: 'Most recent concrete action taken' },
    nextAction: { type: 'string', description: 'Single most important next step' },
    blockers: { type: 'array', items: { type: 'string' }, description: 'Blockers or open questions' },
    openTodos: { type: 'array', items: { type: 'string' }, description: 'All unchecked todo items' },
    isStale: { type: 'boolean', description: 'True if no activity in 14+ days' },
  },
  required: ['status', 'lastActivity', 'nextAction', 'blockers', 'openTodos', 'isStale'],
}
