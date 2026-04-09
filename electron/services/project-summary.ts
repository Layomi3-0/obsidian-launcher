import type { VaultService, Note } from './vault'

export interface ProjectSummaryEntry {
  name: string
  path: string
  status: string
  lastActivity: string
  nextAction: string
  isStale: boolean
}

export interface ProjectSummaryResult {
  projects: ProjectSummaryEntry[]
  generatedAt: string
}

let cache: ProjectSummaryResult | null = null

export function invalidateProjectSummaryCache(): void {
  cache = null
}

export function generateProjectSummary(vaultService: VaultService, projectsFolder: string): ProjectSummaryResult {
  if (isCachedToday()) return cache!

  const notes = vaultService.getAllNotes()
  const projectNotes = findNotesInFolder(notes, projectsFolder)

  if (projectNotes.length === 0) return cacheAndReturn([])

  const recentProjects = projectNotes
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    .slice(0, 8)

  return cacheAndReturn(recentProjects.map(toSummaryEntry))
}

function isCachedToday(): boolean {
  if (!cache) return false
  const today = new Date().toISOString().split('T')[0]
  return cache.generatedAt.split('T')[0] === today
}

function cacheAndReturn(projects: ProjectSummaryEntry[]): ProjectSummaryResult {
  cache = { projects, generatedAt: new Date().toISOString() }
  return cache
}

function findNotesInFolder(notes: Note[], folder: string): Note[] {
  const prefix = folder.endsWith('/') ? folder : folder + '/'
  return notes.filter(note => note.path.startsWith(prefix))
}

function toSummaryEntry(note: Note): ProjectSummaryEntry {
  return {
    name: note.title || note.path.split('/').pop()?.replace(/\.md$/, '') || 'Untitled',
    path: note.path,
    status: extractStatus(note.content),
    lastActivity: extractLastActivity(note.content, note.lastModified),
    nextAction: extractNextAction(note.content),
    isStale: daysSince(note.lastModified) > 14,
  }
}

function extractStatus(content: string): string {
  const statusMatch = content.match(/status:\s*(.+)/i)
  if (statusMatch) return statusMatch[1].trim()

  const totalTodos = (content.match(/- \[[ x]\]/g) || []).length
  const doneTodos = (content.match(/- \[x\]/gi) || []).length
  if (totalTodos > 0) return `${doneTodos}/${totalTodos} tasks done`

  return 'Active'
}

function extractLastActivity(content: string, lastModified: string): string {
  const checkedTodos = content.match(/- \[x\]\s*(.+)/gi)
  if (checkedTodos && checkedTodos.length > 0) {
    return checkedTodos[checkedTodos.length - 1].replace(/- \[x\]\s*/i, '').slice(0, 60)
  }

  const days = daysSince(lastModified)
  if (days === 0) return 'Updated today'
  if (days === 1) return 'Updated yesterday'
  return `Updated ${days}d ago`
}

function extractNextAction(content: string): string {
  const unchecked = content.match(/- \[ \]\s*(.+)/)
  return unchecked ? unchecked[1].slice(0, 60) : 'No open tasks'
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000)
}
