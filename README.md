# Brain Dump

A system-wide macOS launcher that connects to your Obsidian vault. Search notes, capture ideas, summarize YouTube videos, and dump anything interesting — all from one keyboard shortcut.

Built with Electron, React 19, TypeScript, and Tailwind CSS.

Video demo: https://drive.google.com/file/d/1uYm33ufbT0GIdz-CWpsEKJXGI-8ibPTj/view?usp=drive_link
## Features

- **Instant search** — fuzzy + full-text search across your entire vault on every keystroke
- **AI conversations** — ask questions about your notes with Claude or Gemini
- **Note capture** — create and edit vault notes directly from the launcher
- **YouTube transcripts** — paste a link, get a summary saved to your vault
- **Project dashboard** — daily summary of active projects from your vault
- **Composable personality** — edit markdown files to tune the AI's voice and behavior
- **Global hotkey** — `Ctrl+Alt+Space` to summon from anywhere

## Prerequisites

- **macOS** (Electron frameless window, dock hiding, etc.)
- **Node.js** >= 20
- **Obsidian** installed with the [Obsidian CLI](https://github.com/obsidianmd/obsidian-cli) available
- An API key for **Claude** (Anthropic) or **Gemini** (Google)

## Setup

```bash
git clone https://github.com/Layomi3-0/obsidian-launcher.git
cd obsidian-launcher
npm install
```

On first launch, an onboarding flow will guide you through:

1. Selecting your Obsidian vault folder
2. Choosing your AI provider (Claude or Gemini)
3. Entering your API key

Or configure manually in `~/.quick-launcher/config.toml`:

```toml
[general]
vault_path = "/path/to/your/obsidian/vault"
projects_folder = "Projects"

[ai]
provider = "claude"
anthropic_api_key = "sk-ant-..."
# or
# provider = "gemini"
# gemini_api_key = "AIza..."
```

## Development

```bash
npm run dev          # Start in dev mode with hot reload
npm run build        # Production build
npm run start        # Run production build
```

## Testing

```bash
npm test             # Run all 361 tests once
npm run test:watch   # Run in watch mode
npm run typecheck    # TypeScript type checking
```

## Project Structure

```
electron/               # Main process
  main.ts               # App lifecycle, service init
  config.ts             # Config loading/saving (~/.quick-launcher/config.toml)
  ai-handler.ts         # AI query dispatch, streaming, cancel safety
  ipc-handlers.ts       # IPC channel registration
  ipc-config.ts         # Config/onboarding IPC handlers
  services/
    ai.ts               # AI service (provider switching, context gathering)
    ai-streaming.ts     # Gemini + Claude streaming with tool use
    ai-helpers.ts       # Shared utils (token budgeting, conversational detection)
    ai-briefing.ts      # Daily briefing map-reduce pipeline
    project-summary.ts  # Project dashboard (scans vault folder)
    vault.ts            # File watcher + note index
    search.ts           # MiniSearch full-text index
    memory.ts           # SQLite for conversations, embeddings, frecency
    prompts.ts          # Composable prompt assembly
    obsidian-cli.ts     # Obsidian CLI wrapper

src/                    # Renderer (React)
  App.tsx               # Root — onboarding gate + main UI
  hooks/
    useSearch.ts        # Query routing, mode management
    useStreamHandler.ts # AI streaming, queue drain, cancel
    useAppKeyboard.ts   # All keyboard navigation
    useSession.ts       # Session context
    useKeyboard.ts      # Result list navigation
  components/
    Onboarding/         # Multi-step setup flow
    EmptyState/         # Dashboard (projects or kanban)
    AIResponse/         # Chat bubbles, streaming, cancel indicator
    SearchInput.tsx     # Input bar with attachments
    ResultsList.tsx     # Vault search results
    CommandPalette.tsx  # Slash commands
    ConversationList.tsx
    PreviewPane.tsx
    StatusBar.tsx

prompts/                # Default AI personality (copied to ~/.quick-launcher/prompts/)
  CORE.md               # Non-negotiable rules
  SOUL.md               # Voice and personality (user-editable)
  skills/*.md           # Task-specific playbooks

test/                   # Vitest tests mirroring src/ and electron/ structure
```

## Configuration

All config lives in `~/.quick-launcher/`:

| File | Purpose |
|------|---------|
| `config.toml` | API keys, vault path, provider, hotkey |
| `prompts/CORE.md` | AI rules (always loaded) |
| `prompts/SOUL.md` | AI personality (user-editable) |
| `prompts/CONTEXT.md` | Auto-generated vault context |
| `memory/PREFERENCES.md` | User preferences (via `/feedback` command) |
| `launcher.db` | SQLite — conversations, embeddings, frecency |

### Key config options

```toml
[general]
vault_path = "/path/to/vault"
projects_folder = "Projects"      # Relative to vault root
hotkey = "Control+Alt+Space"
kanban_enabled = "false"          # Enable external kanban integration
kanban_path = ""                  # Path to kanban CLI project

[ai]
provider = "claude"               # "claude" or "gemini"
anthropic_api_key = ""
gemini_api_key = ""
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Alt+Space` | Toggle launcher |
| Type text | Search vault |
| `> message` | AI query |
| `/command` | Slash commands |
| `Enter` | Open result / send message |
| `Tab` | Toggle preview pane / autocomplete command |
| `Ctrl+C` | Cancel AI stream |
| `Esc` | Cancel / clear / hide |
| `Arrow keys` | Navigate results |

## License

Open source feel free to modify
