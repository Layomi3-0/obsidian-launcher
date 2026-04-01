import { watch, type FSWatcher } from 'chokidar'
import matter from 'gray-matter'
import { readFileSync, existsSync } from 'fs'
import { join, relative, basename } from 'path'
import { EventEmitter } from 'events'

export interface Note {
  path: string
  title: string
  content: string
  frontmatter: Record<string, unknown>
  tags: string[]
  headings: string[]
  links: string[]
  lastModified: string
}

export interface VaultEvents {
  'note:added': (note: Note) => void
  'note:changed': (note: Note) => void
  'note:removed': (path: string) => void
  'ready': () => void
}

export class VaultService extends EventEmitter {
  private vaultPath: string
  private watcher: FSWatcher | null = null
  private notes: Map<string, Note> = new Map()

  constructor(vaultPath: string) {
    super()
    this.vaultPath = vaultPath
  }

  start(): void {
    if (!existsSync(this.vaultPath)) {
      console.error(`[vault] Path does not exist: ${this.vaultPath}`)
      return
    }

    this.watcher = watch(this.vaultPath, {
      ignoreInitial: false,
      ignored: [
        '**/node_modules/**',
        '**/.obsidian/**',
        '**/.trash/**',
        '**/.git/**',
      ],
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    })

    this.watcher
      .on('add', (absPath) => {
        if (!absPath.endsWith('.md')) return
        const relPath = relative(this.vaultPath, absPath)
        this.handleFile(relPath, 'added')
      })
      .on('change', (absPath) => {
        if (!absPath.endsWith('.md')) return
        const relPath = relative(this.vaultPath, absPath)
        this.handleFile(relPath, 'changed')
      })
      .on('unlink', (absPath) => {
        if (!absPath.endsWith('.md')) return
        const relPath = relative(this.vaultPath, absPath)
        this.handleUnlink(relPath)
      })
      .on('ready', () => {
        console.log(`[vault] Indexed ${this.notes.size} notes from ${this.vaultPath}`)
        this.emit('ready')
      })
  }

  stop(): void {
    this.watcher?.close()
    this.watcher = null
  }

  getNote(path: string): Note | undefined {
    return this.notes.get(path)
  }

  getAllNotes(): Note[] {
    return Array.from(this.notes.values())
  }

  getNoteCount(): number {
    return this.notes.size
  }

  private handleFile(filePath: string, event: 'added' | 'changed'): void {
    const note = this.parseNote(filePath)
    if (!note) return

    this.notes.set(filePath, note)
    this.emit(event === 'added' ? 'note:added' : 'note:changed', note)
  }

  private handleUnlink(filePath: string): void {
    this.notes.delete(filePath)
    this.emit('note:removed', filePath)
  }

  private parseNote(filePath: string): Note | null {
    const absolutePath = join(this.vaultPath, filePath)

    try {
      const raw = readFileSync(absolutePath, 'utf-8')
      const { data: frontmatter, content } = matter(raw)

      const title = extractTitle(filePath, frontmatter, content)
      const tags = extractTags(frontmatter, content)
      const headings = extractHeadings(content)
      const links = extractWikilinks(content)
      const lastModified = new Date().toISOString()

      return { path: filePath, title, content, frontmatter, tags, headings, links, lastModified }
    } catch (err) {
      console.error(`[vault] Failed to parse ${filePath}:`, err)
      return null
    }
  }
}

function extractTitle(filePath: string, frontmatter: Record<string, unknown>, content: string): string {
  if (typeof frontmatter.title === 'string') return frontmatter.title

  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1].trim()

  return basename(filePath, '.md')
}

function extractTags(frontmatter: Record<string, unknown>, content: string): string[] {
  const tags = new Set<string>()

  // From frontmatter
  const fmTags = frontmatter.tags
  if (Array.isArray(fmTags)) {
    fmTags.forEach(t => { if (typeof t === 'string') tags.add(t) })
  } else if (typeof fmTags === 'string') {
    fmTags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tags.add(t))
  }

  // Inline #tags from content
  const inlineTags = content.match(/(?:^|\s)#([a-zA-Z][\w-/]*)/g)
  if (inlineTags) {
    inlineTags.forEach(t => tags.add(t.trim().slice(1)))
  }

  return Array.from(tags)
}

function extractHeadings(content: string): string[] {
  const headings: string[] = []
  const regex = /^#{1,6}\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    headings.push(match[1].trim())
  }
  return headings
}

function extractWikilinks(content: string): string[] {
  const links: string[] = []
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim())
  }
  return links
}
