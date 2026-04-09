import type { GoogleGenerativeAI } from '@google/generative-ai'
import type Anthropic from '@anthropic-ai/sdk'
import type { VaultService } from './vault'
import type { ObsidianCLI } from './obsidian-cli'
import { MAP_SYSTEM_PROMPT, PROJECT_SUMMARY_SCHEMA, type AIConfig } from './ai-helpers'
import { streamGemini, streamClaude } from './ai-streaming'
import { buildMapMessage, buildReduceMessage } from './ai-briefing-messages'

export { buildMapMessage, buildReduceMessage }

export interface ProjectManifestEntry {
  title: string
  path: string
  content: string
  todos: string[]
  done: string[]
  lastModified: string
}

export interface ProjectSummary {
  title: string
  path: string
  status: string
  lastActivity: string
  nextAction: string
  blockers: string[]
  openTodos: string[]
  isStale: boolean
}

export interface BriefingDeps {
  geminiClient: GoogleGenerativeAI | null
  anthropicClient: Anthropic | null
  config: AIConfig
  vaultService: VaultService
  obsidianCLI: ObsidianCLI | null
}

const MAP_CONCURRENCY = 5

export async function* streamBriefing(
  deps: BriefingDeps,
  query: string,
  systemPrompt: string,
  recentHistory: string,
): AsyncGenerator<string> {
  const manifest = await buildProjectManifest(deps)
  console.log(`[ai:briefing] Manifest built: ${manifest.length} projects`)

  if (manifest.length === 0) {
    yield 'No projects found in the Projects/ folder. Check your vault path.'
    return
  }

  yield `> Scanning **${manifest.length}** projects...\n\n`

  const summaries: ProjectSummary[] = []
  for (const batch of batched(manifest, MAP_CONCURRENCY)) {
    yield formatBatchProgress(batch.start, batch.end, manifest.length)
    summaries.push(...await extractBatch(deps, batch.items))
  }

  yield* reportFailures(summaries)
  console.log(`[ai:briefing] Map phase complete. ${summaries.length} summaries`)

  yield* streamReducePhase(deps, summaries, manifest.length, query, systemPrompt, recentHistory)
}

interface Batch<T> { items: T[]; start: number; end: number }

function* batched<T>(items: T[], size: number): Generator<Batch<T>> {
  for (let i = 0; i < items.length; i += size) {
    yield {
      items: items.slice(i, i + size),
      start: i + 1,
      end: Math.min(i + size, items.length),
    }
  }
}

function formatBatchProgress(start: number, end: number, total: number): string {
  return `> Analyzing projects ${start}–${end} of ${total}...\n`
}

function extractBatch(deps: BriefingDeps, entries: ProjectManifestEntry[]): Promise<ProjectSummary[]> {
  return Promise.all(entries.map(entry => extractProjectSummary(deps, entry)))
}

function* reportFailures(summaries: ProjectSummary[]): Generator<string> {
  const failedCount = summaries.filter(s => s.status.startsWith('Extraction failed')).length
  if (failedCount > 0) {
    yield `> ⚠ ${failedCount} project(s) had extraction issues — included with raw data.\n`
  }
  yield '\n'
}

async function* streamReducePhase(
  deps: BriefingDeps,
  summaries: ProjectSummary[],
  manifestCount: number,
  query: string,
  systemPrompt: string,
  recentHistory: string,
): AsyncGenerator<string> {
  const reduceMessage = buildReduceMessage(summaries, manifestCount, query, recentHistory)

  if (deps.config.provider === 'claude' && deps.anthropicClient) {
    yield* streamClaude(deps.anthropicClient, deps.config.anthropicModel, systemPrompt, reduceMessage, deps.obsidianCLI, { disableTools: true })
  } else if (deps.geminiClient) {
    yield* streamGemini(deps.geminiClient, deps.config.geminiModel, systemPrompt, reduceMessage, deps.obsidianCLI, { disableTools: true })
  }

  console.log(`[ai:briefing] Reduce phase complete. Manifest: ${manifestCount}, Summaries: ${summaries.length}`)
}

async function buildProjectManifest(deps: BriefingDeps): Promise<ProjectManifestEntry[]> {
  const projectFiles = await discoverProjectFiles(deps)
  const entries = await Promise.all(
    projectFiles.map(file => buildManifestEntry(deps, file)),
  )
  return entries.filter((e): e is ProjectManifestEntry => e !== null)
}

async function discoverProjectFiles(deps: BriefingDeps): Promise<{ path: string; title: string }[]> {
  if (deps.obsidianCLI?.isAvailable()) {
    const results = await deps.obsidianCLI.search('path:Projects/')
    return results.filter(f => f.path.endsWith('.md'))
  }

  return deps.vaultService.getAllNotes()
    .filter(n => n.path.startsWith('Projects/'))
    .map(n => ({ path: n.path, title: n.title }))
}

async function buildManifestEntry(
  deps: BriefingDeps,
  file: { path: string; title: string },
): Promise<ProjectManifestEntry | null> {
  const note = deps.vaultService.getNote(file.path)
  const content = note?.content ?? await readNoteContent(deps, file.path, file.title)
  if (!content) return null

  return {
    title: file.title,
    path: file.path,
    content,
    todos: parseTodos(content),
    done: parseCompletedItems(content).slice(-5),
    lastModified: note?.lastModified ?? new Date().toISOString(),
  }
}

function parseTodos(content: string): string[] {
  return (content.match(/^- \[ \] .+$/gm) || []).map(t => t.replace('- [ ] ', ''))
}

function parseCompletedItems(content: string): string[] {
  return (content.match(/^- \[x\] .+$/gm) || []).map(t => t.replace('- [x] ', ''))
}

async function extractProjectSummary(deps: BriefingDeps, entry: ProjectManifestEntry): Promise<ProjectSummary> {
  try {
    const raw = await callFastModel(deps, MAP_SYSTEM_PROMPT, buildMapMessage(entry))
    const json = stripCodeFences(raw)
    return parseSummaryResponse(entry, JSON.parse(json))
  } catch (err) {
    console.error(`[ai] Extraction failed for ${entry.title}:`, err)
    return buildFallbackSummary(entry)
  }
}

export function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
}

function parseSummaryResponse(entry: ProjectManifestEntry, parsed: Record<string, unknown>): ProjectSummary {
  return {
    title: entry.title,
    path: entry.path,
    status: (parsed.status as string) ?? 'Unknown',
    lastActivity: (parsed.lastActivity as string) ?? 'No recent activity found',
    nextAction: (parsed.nextAction as string) ?? 'Review project',
    blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
    openTodos: Array.isArray(parsed.openTodos) ? parsed.openTodos : entry.todos,
    isStale: (parsed.isStale as boolean) ?? false,
  }
}

function buildFallbackSummary(entry: ProjectManifestEntry): ProjectSummary {
  return {
    title: entry.title,
    path: entry.path,
    status: 'Extraction failed — raw data included below',
    lastActivity: entry.done.length > 0 ? `Completed: ${entry.done[entry.done.length - 1]}` : 'Unknown',
    nextAction: entry.todos.length > 0 ? entry.todos[0] : 'Review project',
    blockers: [],
    openTodos: entry.todos,
    isStale: false,
  }
}

async function callFastModel(deps: BriefingDeps, systemPrompt: string, userMessage: string): Promise<string> {
  if (deps.config.provider === 'claude' && deps.anthropicClient) {
    return callFastClaude(deps.anthropicClient, deps.config.anthropicModelFast, systemPrompt, userMessage)
  }
  if (deps.geminiClient) {
    return callFastGemini(deps.geminiClient, deps.config.geminiModelFast, systemPrompt, userMessage)
  }
  throw new Error('No AI provider configured for fast model calls')
}

async function callFastGemini(client: GoogleGenerativeAI, model: string, systemPrompt: string, userMessage: string): Promise<string> {
  const generativeModel = client.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: PROJECT_SUMMARY_SCHEMA as any,
    },
  })

  const result = await generativeModel.generateContent(userMessage)
  return result.response.text()
}

async function callFastClaude(client: Anthropic, model: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  return textBlock?.text ?? '{}'
}

async function readNoteContent(deps: BriefingDeps, path: string, title: string): Promise<string | null> {
  const note = deps.vaultService.getNote(path)
  if (note) return note.content
  if (!deps.obsidianCLI?.isAvailable()) return null
  return deps.obsidianCLI.readNote(title)
}
