import { marked } from 'marked'

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

export function renderMarkdown(text: string): string {
  const withLinks = text.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, note, alias) => {
      const display = alias || note
      return `<a class="wikilink" data-note="${escapeAttr(note)}">${display}</a>`
    },
  )
  return marked.parse(withLinks, { async: false, breaks: true }) as string
}
