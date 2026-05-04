const TRIGGER_REGEX = /(?:^|\s)@([\w.-]*)$/

export function detectMentionTrigger(query: string): string | null {
  const match = query.match(TRIGGER_REGEX)
  return match ? match[1] : null
}

export function stripMentionTrigger(query: string): string {
  return query.replace(TRIGGER_REGEX, (match) => (match.startsWith(' ') ? ' ' : ''))
}
