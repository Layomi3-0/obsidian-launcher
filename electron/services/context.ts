import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import type { VaultService } from './vault'
import type { MemoryService } from './memory'
import type { ObsidianCLI } from './obsidian-cli'

const CONTEXT_PATH = join(homedir(), '.brain-dump', 'prompts', 'CONTEXT.md')

export class ContextService {
  private vaultService: VaultService
  private memoryService: MemoryService
  private obsidianCLI: ObsidianCLI | null
  private rebuildTimer: ReturnType<typeof setTimeout> | null = null
  private _ready: Promise<void>
  private _resolveReady!: () => void

  constructor(vaultService: VaultService, memoryService: MemoryService, obsidianCLI?: ObsidianCLI) {
    this.vaultService = vaultService
    this.memoryService = memoryService
    this.obsidianCLI = obsidianCLI ?? null
    this._ready = new Promise(resolve => { this._resolveReady = resolve })
  }

  get ready(): Promise<void> {
    return this._ready
  }

  start(): void {
    this.rebuild()

    // Rebuild on vault changes (debounced 30s)
    const debouncedRebuild = () => {
      if (this.rebuildTimer) clearTimeout(this.rebuildTimer)
      this.rebuildTimer = setTimeout(() => this.rebuild(), 30_000)
    }

    this.vaultService.on('note:added', debouncedRebuild)
    this.vaultService.on('note:changed', debouncedRebuild)
    this.vaultService.on('note:removed', debouncedRebuild)

    // Rebuild daily at midnight
    this.scheduleMidnightRebuild()
  }

  rebuild(): void {
    this.generateContext().then(content => {
      const dir = dirname(CONTEXT_PATH)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

      writeFileSync(CONTEXT_PATH, content, 'utf-8')
      console.log(`[context] CONTEXT.md rebuilt (${content.length} chars)`)
      this._resolveReady()
    }).catch(err => {
      console.error('[context] Failed to rebuild CONTEXT.md:', err)
      this._resolveReady()
    })
  }

  private async generateContext(): Promise<string> {
    const notes = this.vaultService.getAllNotes()
    const sections: string[] = ['# Auto-Generated Context\n']

    // Vault overview
    sections.push(this.buildVaultOverview(notes))

    // Active projects (recently modified)
    sections.push(this.buildActiveProjects(notes))

    // Open loops (unchecked tasks)
    sections.push(this.buildOpenLoops(notes))

    // Tag map from Obsidian CLI
    sections.push(await this.buildTagMap())

    // Recent interaction summary
    sections.push(this.buildRecentActivity())

    // Frequently accessed notes
    sections.push(this.buildFrequentNotes())

    return sections.filter(Boolean).join('\n\n')
  }

  private buildVaultOverview(notes: ReturnType<VaultService['getAllNotes']>): string {
    const folders = new Map<string, number>()
    for (const note of notes) {
      const topFolder = note.path.split('/')[0] || 'root'
      folders.set(topFolder, (folders.get(topFolder) ?? 0) + 1)
    }

    const folderLines = Array.from(folders.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([folder, count]) => `- ${folder}: ${count} notes`)
      .join('\n')

    return `## Vault Structure (${notes.length} notes)\n${folderLines}`
  }

  private buildActiveProjects(notes: ReturnType<VaultService['getAllNotes']>): string {
    const projectNotes = notes.filter(n => n.path.startsWith('Projects/'))

    if (projectNotes.length === 0) return ''

    const lines = projectNotes.map(n => `- [[${n.title}]] (${n.path})`).join('\n')
    return `## Projects (${projectNotes.length})\n${lines}`
  }

  private buildOpenLoops(notes: ReturnType<VaultService['getAllNotes']>): string {
    const loops: { note: string; task: string }[] = []

    for (const note of notes) {
      const unchecked = note.content.match(/^- \[ \] .+$/gm)
      if (unchecked) {
        for (const task of unchecked.slice(0, 3)) {
          loops.push({ note: note.title, task: task.replace('- [ ] ', '').trim() })
          if (loops.length >= 10) break
        }
      }
      if (loops.length >= 10) break
    }

    if (loops.length === 0) return ''

    const lines = loops.map(l => `- [[${l.note}]]: ${l.task}`).join('\n')
    return `## Open Loops\n${lines}`
  }

  private async buildTagMap(): Promise<string> {
    if (!this.obsidianCLI?.isAvailable()) return ''

    try {
      const tags = await this.obsidianCLI.listTags()
      if (tags.length === 0) return ''

      const lines = tags.slice(0, 15).map(t => `- #${t.name}`).join('\n')
      return `## Top Tags\n${lines}`
    } catch {
      return ''
    }
  }

  private buildRecentActivity(): string {
    const interactions = this.memoryService.getRecentInteractions(10)
    if (interactions.length === 0) return ''

    const topics = new Set<string>()
    for (const i of interactions) {
      topics.add(i.query.replace(/^[/>]\s*/, '').slice(0, 50))
    }

    const lines = Array.from(topics).slice(0, 5).map(t => `- ${t}`).join('\n')
    return `## Recent Queries\n${lines}`
  }

  private buildFrequentNotes(): string {
    const scores = this.memoryService.getFrecencyScores()
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    if (sorted.length === 0) return ''

    const lines = sorted.map(([path, score]) => `- ${path} (score: ${score.toFixed(1)})`).join('\n')
    return `## Frequently Accessed\n${lines}`
  }

  private scheduleMidnightRebuild(): void {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const msUntilMidnight = midnight.getTime() - now.getTime()

    setTimeout(() => {
      this.rebuild()
      // Then rebuild every 24h
      setInterval(() => this.rebuild(), 24 * 60 * 60 * 1000)
    }, msUntilMidnight)
  }
}
