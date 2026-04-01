import type { ProjectManifestEntry, ProjectSummary } from './ai-briefing'

export function buildMapMessage(entry: ProjectManifestEntry): string {
  const parts = [
    `Project: ${entry.title}`,
    `Path: ${entry.path}`,
    `Last modified: ${entry.lastModified}`,
    `\nContent:\n${entry.content}`,
  ]

  if (entry.todos.length > 0) {
    parts.push(`\nOpen TODOs:\n${entry.todos.map(t => `- [ ] ${t}`).join('\n')}`)
  }
  if (entry.done.length > 0) {
    parts.push(`\nRecently completed:\n${entry.done.map(t => `- [x] ${t}`).join('\n')}`)
  }

  return parts.join('\n')
}

export function buildReduceMessage(
  summaries: ProjectSummary[],
  manifestCount: number,
  query: string,
  recentHistory: string,
): string {
  const parts = [
    formatSummariesHeader(summaries.length, manifestCount),
    ...summaries.map((s, i) => formatSummarySection(s, i + 1)),
  ]

  if (recentHistory) {
    parts.push('\n## Recent queries this session\n' + recentHistory)
  }

  parts.push(buildReduceInstructions(query, manifestCount))
  return parts.join('\n\n')
}

function formatSummariesHeader(count: number, total: number): string {
  return `## Pre-Extracted Project Summaries (${count} of ${total} projects)\n\nEach project below was individually analyzed. Synthesize into a briefing.\n`
}

function formatSummarySection(summary: ProjectSummary, index: number): string {
  const lines = [
    `### ${index}. [[${summary.title}]] (${summary.path})`,
    `- **Status**: ${summary.status}`,
    `- **Last activity**: ${summary.lastActivity}`,
    `- **Next action**: ${summary.nextAction}`,
  ]

  if (summary.blockers.length > 0) {
    lines.push(`- **Blockers**: ${summary.blockers.join('; ')}`)
  }
  if (summary.openTodos.length > 0) {
    lines.push(formatTodoLine(summary.openTodos))
  }
  if (summary.isStale) {
    lines.push('- **⚠ STALE** — no recent activity')
  }

  return lines.join('\n')
}

function formatTodoLine(todos: string[]): string {
  const preview = todos.slice(0, 5).join(', ')
  const overflow = todos.length > 5 ? ` (+${todos.length - 5} more)` : ''
  return `- **Open TODOs** (${todos.length}): ${preview}${overflow}`
}

function buildReduceInstructions(query: string, manifestCount: number): string {
  const cleanQuery = query.replace(/^[/>]\s*/, '').trim()
  return [
    `\n## Instruction\n${cleanQuery}`,
    `\nYou received exactly **${manifestCount}** project summaries above, numbered 1–${manifestCount}.`,
    `Your briefing MUST cover ALL ${manifestCount} projects. Do NOT skip any.`,
    'After covering all projects, include: Quick wins, Stale projects, and Top 3 priorities for today.',
    `End with: "**Verification: ${manifestCount}/${manifestCount} projects covered.**"`,
  ].join('\n')
}
