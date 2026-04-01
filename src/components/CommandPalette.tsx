import { useRef, useEffect } from 'react'

export interface SlashCommand {
  name: string
  label: string
  description: string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: '/briefing', label: 'briefing', description: 'Morning briefing with tasks and priorities' },
  { name: '/history', label: 'history', description: 'Browse and resume previous conversations' },
  { name: '/new', label: 'new', description: 'Start a fresh conversation' },
  { name: '/project', label: 'project', description: 'Convert a note into a standardized project template' },
  { name: '/capture', label: 'capture', description: 'Quick capture — structure a thought into a note' },
  { name: '/prep', label: 'prep', description: 'Meeting prep — gather context for a meeting' },
  { name: '/connect', label: 'connect', description: 'Discover connections between notes' },
  { name: '/summarize', label: 'summarize', description: 'Summarize a note — use with [[NoteName]]' },
  { name: '/daily', label: 'daily', description: 'Read or append to today\'s daily note' },
  { name: '/tags', label: 'tags', description: 'Show top tags in your vault' },
  { name: '/search', label: 'search', description: 'Deep search using Obsidian\'s engine' },
]

interface CommandPaletteProps {
  filter: string
  selectedIndex: number
  onSelect: (command: SlashCommand) => void
}

export function filterCommands(input: string): SlashCommand[] {
  const term = input.replace(/^\//, '').toLowerCase()
  if (!term) return SLASH_COMMANDS
  return SLASH_COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().startsWith(term) ||
    cmd.description.toLowerCase().includes(term),
  )
}

export function CommandPalette({ filter, selectedIndex, onSelect }: CommandPaletteProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const commands = filterCommands(filter)

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (commands.length === 0) return null

  return (
    <div
      ref={listRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '6px 0',
      }}
    >
      {commands.map((cmd, i) => {
        const isSelected = i === selectedIndex
        return (
          <div
            key={cmd.name}
            onClick={() => onSelect(cmd)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 20px',
              cursor: 'pointer',
              background: isSelected ? 'rgba(168, 140, 255, 0.1)' : 'transparent',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span
              style={{
                flexShrink: 0,
                padding: '2px 8px',
                borderRadius: '5px',
                background: isSelected ? 'rgba(168, 140, 255, 0.18)' : 'rgba(255,255,255,0.06)',
                color: isSelected ? '#a88cff' : 'rgba(255,255,255,0.5)',
                fontSize: '12.5px',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
            >
              {cmd.name}
            </span>
            <span
              style={{
                color: isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {cmd.description}
            </span>
          </div>
        )
      })}
    </div>
  )
}
