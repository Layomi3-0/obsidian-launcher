/**
 * End-to-end briefing pipeline test.
 * Tests: skill detection → manifest → map (real API call) → reduce message.
 *
 * Usage: npx tsx scripts/test-briefing.mts
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative, basename } from 'path'
import matter from 'gray-matter'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ── Config ──
const VAULT_PATH = '/Users/jkupo/Documents/Resources/Kupo-brain'
const PROJECTS_DIR = join(VAULT_PATH, 'Projects')
const CONFIG_PATH = join(process.env.HOME!, '.quick-launcher/config.toml')

function loadApiKey(): string {
  if (!existsSync(CONFIG_PATH)) throw new Error('No config.toml found')
  const content = readFileSync(CONFIG_PATH, 'utf-8')
  const match = content.match(/gemini_api_key\s*=\s*"([^"]+)"/)
  return match?.[1] ?? ''
}

// ── Types ──
interface ProjectManifestEntry {
  title: string; path: string; content: string
  todos: string[]; done: string[]; lastModified: string
}
interface ProjectSummary {
  title: string; path: string; status: string; lastActivity: string
  nextAction: string; blockers: string[]; openTodos: string[]; isStale: boolean
}

// ── Test 1: Skill Detection ──
function testSkillDetection(): boolean {
  console.log('\n── Test 1: Skill Detection ──')

  // Simulate what detectSkill does with the fix
  function detectSkill(query: string): string | null {
    const q = query.replace(/^[>/]\s*/, '').trim().toLowerCase()
    if (q.startsWith('briefing') || q === 'morning') return 'daily-briefing'
    if (q.startsWith('capture')) return 'capture'
    return null
  }

  const cases = [
    { input: '>briefing', expected: 'daily-briefing' },
    { input: '> briefing', expected: 'daily-briefing' },
    { input: '/briefing', expected: 'daily-briefing' },
    { input: '>morning', expected: 'daily-briefing' },
    { input: 'briefing', expected: 'daily-briefing' },
    { input: '>some random query', expected: null },
  ]

  let pass = true
  for (const { input, expected } of cases) {
    const result = detectSkill(input)
    const ok = result === expected
    console.log(`  ${ok ? '✅' : '❌'} detectSkill("${input}") → ${result} ${ok ? '' : `(expected ${expected})`}`)
    if (!ok) pass = false
  }
  return pass
}

// ── Test 2: Manifest ──
function buildManifest(): ProjectManifestEntry[] {
  const manifest: ProjectManifestEntry[] = []
  function walk(dir: string): string[] {
    const paths: string[] = []
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name)
      if (e.isDirectory()) paths.push(...walk(full))
      else if (e.name.endsWith('.md')) paths.push(full)
    }
    return paths
  }
  for (const absPath of walk(PROJECTS_DIR)) {
    const relPath = relative(VAULT_PATH, absPath)
    const raw = readFileSync(absPath, 'utf-8')
    const { content } = matter(raw)
    const h1 = content.match(/^#\s+(.+)$/m)
    const title = h1?.[1]?.trim() ?? basename(relPath, '.md')
    const todos = (content.match(/^- \[ \] .+$/gm) || []).map(t => t.replace('- [ ] ', ''))
    const done = (content.match(/^- \[x\] .+$/gm) || []).map(t => t.replace('- [x] ', ''))
    const stat = statSync(absPath)
    manifest.push({ title, path: relPath, content, todos, done: done.slice(-5), lastModified: stat.mtime.toISOString() })
  }
  return manifest
}

function testManifest(manifest: ProjectManifestEntry[]): boolean {
  console.log('\n── Test 2: Project Manifest ──')
  console.log(`  Found ${manifest.length} projects`)
  for (const e of manifest) {
    console.log(`  • ${e.title} — ${e.todos.length} todos, modified ${e.lastModified.slice(0, 10)}`)
  }
  const dailyNotes = manifest.filter(e => /\d{4}-\d{2}-\d{2}/.test(e.title) || e.path.toLowerCase().includes('daily'))
  if (dailyNotes.length > 0) {
    console.log('  ❌ Daily notes leaked into manifest:')
    dailyNotes.forEach(d => console.log(`    ${d.path}`))
    return false
  }
  console.log(`  ✅ No daily notes in manifest`)
  return manifest.length > 0
}

// ── Test 3: Real API map call ──
const MAP_SYSTEM_PROMPT = `You are a project status extractor. Given a project note from an Obsidian vault, extract structured information.
Return ONLY valid JSON matching this schema — no markdown, no explanation, no wrapping.

{
  "status": "brief one-line status summary",
  "lastActivity": "most recent concrete action taken",
  "nextAction": "the single most important next step",
  "blockers": ["list of blockers — empty array if none"],
  "openTodos": ["list of all unchecked todo items"],
  "isStale": false
}

Rules:
- "isStale" is true if no meaningful activity in the last 14+ days.
- Be SPECIFIC — quote actual task text.`

const PROJECT_SUMMARY_SCHEMA = {
  type: 'object' as const,
  properties: {
    status: { type: 'string' as const, description: 'Brief one-line project status' },
    lastActivity: { type: 'string' as const, description: 'Most recent concrete action taken' },
    nextAction: { type: 'string' as const, description: 'Single most important next step' },
    blockers: { type: 'array' as const, items: { type: 'string' as const }, description: 'Blockers or open questions' },
    openTodos: { type: 'array' as const, items: { type: 'string' as const }, description: 'All unchecked todo items' },
    isStale: { type: 'boolean' as const, description: 'True if no activity in 14+ days' },
  },
  required: ['status', 'lastActivity', 'nextAction', 'blockers', 'openTodos', 'isStale'],
}

async function testMapPhase(manifest: ProjectManifestEntry[]): Promise<ProjectSummary[]> {
  console.log('\n── Test 3: Map Phase (real Gemini 2.5 Flash API) ──')
  const apiKey = loadApiKey()
  if (!apiKey) { console.log('  ⚠ No API key — skipping'); return [] }

  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: MAP_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: PROJECT_SUMMARY_SCHEMA as any,
    },
  })

  // Test with first 3 projects
  const testProjects = manifest.slice(0, 3)
  const summaries: ProjectSummary[] = []

  for (const entry of testProjects) {
    const userMsg = [
      `Project: ${entry.title}`, `Path: ${entry.path}`, `Last modified: ${entry.lastModified}`,
      `\nContent:\n${entry.content.slice(0, 3000)}`,
      entry.todos.length > 0 ? `\nOpen TODOs:\n${entry.todos.map(t => `- [ ] ${t}`).join('\n')}` : '',
      entry.done.length > 0 ? `\nRecently completed:\n${entry.done.map(t => `- [x] ${t}`).join('\n')}` : '',
    ].filter(Boolean).join('\n')

    try {
      const result = await model.generateContent(userMsg)
      const raw = result.response.text()
      const parsed = JSON.parse(raw)
      const summary: ProjectSummary = {
        title: entry.title, path: entry.path,
        status: parsed.status ?? 'Unknown',
        lastActivity: parsed.lastActivity ?? 'Unknown',
        nextAction: parsed.nextAction ?? 'Review',
        blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
        openTodos: Array.isArray(parsed.openTodos) ? parsed.openTodos : [],
        isStale: parsed.isStale ?? false,
      }
      summaries.push(summary)
      console.log(`  ✅ ${entry.title}:`)
      console.log(`     Status: ${summary.status}`)
      console.log(`     Next: ${summary.nextAction}`)
      console.log(`     Stale: ${summary.isStale}`)
    } catch (err) {
      console.log(`  ❌ ${entry.title}: ${err instanceof Error ? err.message : err}`)
    }
  }

  // Check for daily note content in summaries
  const badPatterns = /morning brief|calendar|reminder|overdue|daily note|schedule/i
  const leaky = summaries.filter(s =>
    badPatterns.test(s.status) || badPatterns.test(s.lastActivity) || badPatterns.test(s.nextAction)
  )
  if (leaky.length > 0) {
    console.log(`  ❌ Daily note content leaked into ${leaky.length} summaries`)
  } else {
    console.log(`  ✅ No daily note content in any summary`)
  }

  return summaries
}

// ── Test 4: Reduce message ──
function testReduceMessage(summaries: ProjectSummary[], manifestCount: number): boolean {
  console.log('\n── Test 4: Reduce Message ──')

  const parts: string[] = []
  parts.push(`## Pre-Extracted Project Summaries (${summaries.length} of ${manifestCount} projects)\n`)
  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i]
    parts.push(`### ${i + 1}. [[${s.title}]] (${s.path})\n- **Status**: ${s.status}\n- **Next**: ${s.nextAction}`)
  }
  parts.push(`\nYou received exactly **${manifestCount}** project summaries. Cover ALL ${manifestCount}.`)
  parts.push(`End with: "**Verification: ${manifestCount}/${manifestCount} projects covered.**"`)
  const msg = parts.join('\n\n')

  console.log(`  Message length: ${msg.length} chars`)

  const badPatterns = /daily note|morning brief|calendar overview|reminders?:\s/i
  if (badPatterns.test(msg)) {
    console.log('  ❌ Daily note content found in reduce message')
    return false
  }
  console.log('  ✅ Reduce message is clean')
  console.log('\n  --- Preview (first 1500 chars) ---')
  console.log(msg.slice(0, 1500))
  return true
}

// ── Run all tests ──
async function main() {
  console.log('=== BRIEFING PIPELINE E2E TEST ===')

  const t1 = testSkillDetection()
  const manifest = buildManifest()
  const t2 = testManifest(manifest)
  const summaries = await testMapPhase(manifest)
  const t3 = summaries.length > 0
  const t4 = testReduceMessage(summaries.length > 0 ? summaries : manifest.map(e => ({
    title: e.title, path: e.path, status: `${e.todos.length} open tasks`,
    lastActivity: 'mock', nextAction: e.todos[0] ?? 'Review', blockers: [], openTodos: e.todos, isStale: false,
  })), manifest.length)

  console.log('\n=== RESULTS ===')
  console.log(`  Skill detection: ${t1 ? '✅' : '❌'}`)
  console.log(`  Manifest build:  ${t2 ? '✅' : '❌'}`)
  console.log(`  Map phase (API): ${t3 ? '✅' : '❌'}`)
  console.log(`  Reduce message:  ${t4 ? '✅' : '❌'}`)
  console.log(`\n  ${t1 && t2 && t3 && t4 ? '✅ ALL PASSED' : '❌ SOME FAILED'}`)
}

main().catch(console.error)
