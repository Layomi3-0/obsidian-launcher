import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

import type { CLISearchResult, CLITag } from './obsidian-cli-parsers'
import { execCLI, parsePathLines, prepareContent } from './obsidian-cli-parsers'

export type { CLISearchResult, CLITag }

const OBSIDIAN_BIN = '/Applications/Obsidian.app/Contents/MacOS/obsidian'

export class ObsidianCLI {
  private available = true
  private recheckTimer: ReturnType<typeof setInterval> | null = null
  private vaultPath: string | null = null

  setVaultPath(path: string): void { this.vaultPath = path }
  getVaultPath(): string | null { return this.vaultPath }
  isAvailable(): boolean { return this.available }

  stop(): void {
    if (this.recheckTimer) clearInterval(this.recheckTimer)
  }

  async checkAvailability(): Promise<boolean> {
    try {
      await this.exec(['version'])
      this.available = true
      console.log('[obsidian-cli] Available')
    } catch {
      this.available = false
      console.warn('[obsidian-cli] Not available — falling back to direct file access')
    }
    this.recheckTimer = setInterval(() => {
      if (!this.available) {
        this.exec(['version'])
          .then(() => { this.available = true; console.log('[obsidian-cli] Now available') })
          .catch(() => {})
      }
    }, 60_000)
    return this.available
  }

  async search(query: string): Promise<CLISearchResult[]> {
    if (!this.available) return []
    return parsePathLines(await this.exec(['search', `query=${query}`]))
  }

  async searchByTag(tag: string): Promise<CLISearchResult[]> {
    if (!this.available) return []
    return parsePathLines(await this.exec(['search', `query=[tag:${tag}]`]))
  }

  async readNote(name: string): Promise<string | null> {
    if (!this.available) return null
    try {
      const notePath = await this.findNotePath(name)
      if (notePath) return await this.exec(['read', `path=${notePath}`])
      return await this.exec(['read', `file=${name}`])
    } catch { return null }
  }

  async readNotePath(path: string): Promise<string | null> {
    if (!this.available) return null
    try { return await this.exec(['read', `path=${path}`]) } catch { return null }
  }

  async dailyRead(): Promise<string | null> {
    if (!this.available) return null
    try { return await this.exec(['daily:read']) } catch { return null }
  }

  async dailyAppend(content: string): Promise<boolean> {
    if (!this.available) return false
    try { await this.exec(['daily:append', `content=${content}`]); return true } catch { return false }
  }

  async openNote(name: string): Promise<boolean> {
    console.log('[obsidian-cli] openNote called, available:', this.available, 'name:', name)
    if (!this.available) return false
    try {
      console.log('[obsidian-cli] openNote success:', await this.exec(['open', `file=${name}`]))
      return true
    } catch (err) { console.error('[obsidian-cli] openNote failed:', err); return false }
  }

  async createNote(name: string, content: string, folder?: string): Promise<boolean> {
    if (!this.available) return false
    console.log(`[obsidian-cli] createNote: name="${name}", content=${content.length} chars, folder="${folder || ''}"`)
    const existing = await this.findNotePath(name)
    if (existing) {
      console.warn(`[obsidian-cli] createNote BLOCKED: "${name}" already exists at ${existing}. Use edit_note instead.`)
      return false
    }
    try {
      const args = ['create', `name=${name}`, prepareContent(content)]
      if (folder) args.push(`path=${folder.replace(/\/+$/, '')}/${name}.md`)
      const output = await this.exec(args)
      const created = await this.verifyNoteExists(name)
      if (!created) console.error(`[obsidian-cli] createNote: CLI returned success but note "${name}" not found. Output: ${output}`)
      return created
    } catch (err) { console.error(`[obsidian-cli] createNote failed:`, err); return false }
  }

  async overwriteNote(name: string, content: string): Promise<{ success: boolean; path: string | null }> {
    if (!this.available) return { success: false, path: null }
    const notePath = await this.findNotePath(name)
    if (!notePath) return { success: false, path: null }
    console.log(`[obsidian-cli] overwriteNote: name="${name}", path="${notePath}", content=${content.length} chars`)
    if (this.vaultPath) {
      try {
        writeFileSync(join(this.vaultPath, notePath), content, 'utf-8')
        console.log(`[obsidian-cli] overwriteNote: wrote ${content.length} chars to ${join(this.vaultPath, notePath)}`)
        return { success: true, path: notePath }
      } catch (err) { console.error(`[obsidian-cli] overwriteNote filesystem write failed:`, err); return { success: false, path: notePath } }
    }
    try {
      await this.exec(['create', `name=${name}`, prepareContent(content), 'overwrite'])
      return { success: true, path: notePath }
    } catch (err) { console.error(`[obsidian-cli] overwriteNote CLI fallback failed:`, err); return { success: false, path: notePath } }
  }

  async findNotePath(name: string): Promise<string | null> {
    if (!this.available) return null
    const bareName = name.replace(/\.md$/, '').split('/').pop() ?? name
    try {
      const output = await this.exec(['file', `file=${name}`])
      const lines = output.split('\n')
      const foundPath = lines.find(l => l.startsWith('path\t'))?.split('\t')[1]?.trim() || null
      const foundName = lines.find(l => l.startsWith('name\t'))?.split('\t')[1]?.trim() || null
      if (!foundPath || !foundName) return null
      if (foundName.toLowerCase() !== bareName.toLowerCase()) {
        console.warn(`[obsidian-cli] findNotePath: asked for "${bareName}" but CLI returned "${foundName}" — rejecting fuzzy match`)
        return null
      }
      return foundPath
    } catch { return null }
  }

  async appendToNote(name: string, content: string): Promise<boolean> {
    if (!this.available) return false
    console.log(`[obsidian-cli] appendToNote: file="${name}", content=${content.length} chars`)
    const notePath = await this.findNotePath(name)
    if (notePath && this.vaultPath) {
      try {
        const absPath = join(this.vaultPath, notePath)
        writeFileSync(absPath, readFileSync(absPath, 'utf-8') + '\n' + content, 'utf-8')
        console.log(`[obsidian-cli] appendToNote: appended ${content.length} chars to ${absPath}`)
        return true
      } catch (err) { console.error(`[obsidian-cli] appendToNote filesystem write failed:`, err) }
    }
    try {
      const ref = notePath ? `path=${notePath}` : `file=${name}`
      await this.exec(['append', ref, `content=${content}`])
      return true
    } catch (err) { console.error(`[obsidian-cli] appendToNote failed:`, err); return false }
  }

  async prependToNote(name: string, content: string): Promise<boolean> {
    if (!this.available) return false
    const notePath = await this.findNotePath(name)
    if (notePath && this.vaultPath) {
      try {
        const absPath = join(this.vaultPath, notePath)
        writeFileSync(absPath, content + '\n' + readFileSync(absPath, 'utf-8'), 'utf-8')
        return true
      } catch (err) { console.error(`[obsidian-cli] prependToNote filesystem write failed:`, err) }
    }
    try {
      const ref = notePath ? `path=${notePath}` : `file=${name}`
      await this.exec(['prepend', ref, `content=${content}`])
      return true
    } catch { return false }
  }

  async moveNote(file: string, to: string): Promise<boolean> {
    if (!this.available) return false
    try { await this.exec(['move', `file=${file}`, `to=${to}`]); return true } catch { return false }
  }

  async listTags(): Promise<CLITag[]> {
    if (!this.available) return []
    try {
      const output = await this.exec(['tags', 'sort=count'])
      return output.split('\n').filter(Boolean).map(line => ({ name: line.replace(/^#/, '') }))
    } catch { return [] }
  }

  async getBacklinks(name: string): Promise<string[]> {
    if (!this.available) return []
    try {
      const output = await this.exec(['backlinks', `file=${name}`])
      return output.includes('No backlinks found') ? [] : output.split('\n').filter(Boolean)
    } catch { return [] }
  }

  async getProperties(name: string): Promise<Record<string, string> | null> {
    if (!this.available) return null
    try {
      const output = await this.exec(['properties', `file=${name}`])
      if (output.includes('No frontmatter found')) return null
      const props: Record<string, string> = {}
      for (const line of output.split('\n')) {
        const sep = line.indexOf('\t')
        if (sep !== -1) props[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
      }
      return props
    } catch { return null }
  }

  async openNotePath(path: string): Promise<boolean> {
    console.log('[obsidian-cli] openNotePath called, available:', this.available, 'path:', path)
    if (!this.available) return false
    try {
      console.log('[obsidian-cli] openNotePath success:', await this.exec(['open', `path=${path}`]))
      return true
    } catch (err) { console.error('[obsidian-cli] openNotePath failed:', err); return false }
  }

  private async verifyNoteExists(name: string): Promise<boolean> {
    try {
      const path = await this.findNotePath(name)
      console.log(`[obsidian-cli] verifyNoteExists("${name}"): ${path ?? 'NOT FOUND'}`)
      return path !== null
    } catch { return false }
  }

  private exec(args: string[]): Promise<string> {
    return execCLI(OBSIDIAN_BIN, args, () => { this.available = false })
  }
}
