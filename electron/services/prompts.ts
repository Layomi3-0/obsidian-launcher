import { readFileSync, existsSync, mkdirSync, cpSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { app } from 'electron'

const USER_PROMPTS_DIR = join(homedir(), '.quick-launcher', 'prompts')
const USER_MEMORY_DIR = join(homedir(), '.quick-launcher', 'memory')
// In dev, app.getAppPath() is the project root. In prod, it's the asar.
const REPO_PROMPTS_DIR = join(app?.getAppPath?.() || join(__dirname, '../..'), 'prompts')

export class PromptService {
  constructor() {
    this.ensureUserPrompts()
    this.logResolvedPaths()
  }

  private ensureUserPrompts(): void {
    if (!existsSync(USER_PROMPTS_DIR)) {
      try {
        mkdirSync(USER_PROMPTS_DIR, { recursive: true })
        cpSync(REPO_PROMPTS_DIR, USER_PROMPTS_DIR, { recursive: true })
        console.log('[prompts] Copied default prompts to', USER_PROMPTS_DIR)
      } catch (err) {
        console.error('[prompts] Failed to copy defaults:', err)
      }
      return
    }

    // Sync skill files: copy any new/updated skills from repo that are
    // newer than the user's copy (user-edited files are preserved if
    // their mtime is newer than the repo version)
    this.syncSkills()
  }

  private syncSkills(): void {
    const repoSkillsDir = join(REPO_PROMPTS_DIR, 'skills')
    const userSkillsDir = join(USER_PROMPTS_DIR, 'skills')

    if (!existsSync(repoSkillsDir)) return
    if (!existsSync(userSkillsDir)) {
      mkdirSync(userSkillsDir, { recursive: true })
    }

    try {
      const { readdirSync, statSync } = require('fs')
      const files = readdirSync(repoSkillsDir) as string[]

      for (const file of files) {
        if (!file.endsWith('.md')) continue
        const repoPath = join(repoSkillsDir, file)
        const userPath = join(userSkillsDir, file)

        if (!existsSync(userPath)) {
          cpSync(repoPath, userPath)
          console.log(`[prompts] Added new skill: ${file}`)
          continue
        }

        const repoMtime = statSync(repoPath).mtimeMs
        const userMtime = statSync(userPath).mtimeMs
        if (repoMtime > userMtime) {
          cpSync(repoPath, userPath)
          console.log(`[prompts] Updated skill: ${file}`)
        }
      }
    } catch (err) {
      console.error('[prompts] Failed to sync skills:', err)
    }
  }

  private logResolvedPaths(): void {
    const paths = [
      ['CORE.md', join(USER_PROMPTS_DIR, 'CORE.md')],
      ['SOUL.md', join(USER_PROMPTS_DIR, 'SOUL.md')],
      ['CONTEXT.md', join(USER_PROMPTS_DIR, 'CONTEXT.md')],
      ['PREFERENCES.md', join(USER_MEMORY_DIR, 'PREFERENCES.md')],
    ]
    console.log('[prompts] Resolved paths:')
    for (const [label, path] of paths) {
      const status = existsSync(path) ? 'found' : 'missing'
      console.log(`[prompts]   ${label}: ${path} [${status}]`)
    }
    console.log(`[prompts]   repo fallback: ${REPO_PROMPTS_DIR}`)
  }

  loadPrompt(name: string): string {
    const userPath = join(USER_PROMPTS_DIR, name)
    if (existsSync(userPath)) return readFileSync(userPath, 'utf-8')

    const repoPath = join(REPO_PROMPTS_DIR, name)
    if (existsSync(repoPath)) return readFileSync(repoPath, 'utf-8')

    return ''
  }

  private loadOptionalFile(absolutePath: string, label: string): string {
    try {
      if (!existsSync(absolutePath)) {
        console.log(`[prompts] ${label} not found at ${absolutePath} — skipping`)
        return ''
      }
      const content = readFileSync(absolutePath, 'utf-8').trim()
      if (!content) {
        console.log(`[prompts] ${label} is empty — skipping`)
        return ''
      }
      console.log(`[prompts] ${label} loaded (${content.length} chars)`)
      return content
    } catch (err) {
      console.error(`[prompts] Failed to read ${label}:`, err)
      return ''
    }
  }

  assembleSystemPrompt(skillName?: string): string {
    const parts: string[] = []

    const core = this.loadPrompt('CORE.md')
    if (core) parts.push(core)

    const soul = this.loadPrompt('SOUL.md')
    if (soul) parts.push(soul)

    const context = this.loadPrompt('CONTEXT.md')
    if (context) parts.push(context)

    const preferences = this.loadOptionalFile(
      join(USER_MEMORY_DIR, 'PREFERENCES.md'),
      'PREFERENCES.md',
    )
    if (preferences) parts.push(`## User Preferences\n\n${preferences}`)

    if (skillName) {
      const skill = this.loadPrompt(`skills/${skillName}.md`)
      if (skill) parts.push(skill)
    }

    console.log(`[prompts] Assembled system prompt: ${parts.length} sections (core=${!!core}, soul=${!!soul}, context=${!!context}, preferences=${!!preferences}, skill=${skillName ?? 'none'})`)

    return parts.join('\n\n---\n\n')
  }

  detectSkill(query: string): string | null {
    // Strip > or / prefix that the renderer adds before matching
    const q = query.replace(/^[>/]\s*/, '').trim().toLowerCase()

    if (q.startsWith('briefing') || q === 'morning') return 'daily-briefing'
    if (q.startsWith('project')) return 'project-template'
    if (q.startsWith('capture')) return 'capture'
    if (q.startsWith('prep')) return 'meeting-prep'
    if (q.includes('summarize') && q.includes('[[')) return 'summarize'
    if (q.startsWith('connect') || q.startsWith('discover')) return 'connection-discovery'
    if (q.includes('youtube.com/') || q.includes('youtu.be/')) return 'youtube-transcript'

    return null
  }
}
