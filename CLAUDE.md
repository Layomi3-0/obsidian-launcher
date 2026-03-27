# CLAUDE.md — Quick Launcher

## What Is This?

An AI-powered system-wide launcher for macOS built with Electron. It replaces Spotlight and deeply integrates with an Obsidian vault via Gemini 3.1 Pro. The three pillars are: **Snappy** (instant local search, AI only when needed), **Memory** (persistent context across sessions), and **Soul** (consistent personality loaded from editable markdown files).

## Before You Start

1. Read `PLAN.md` — it has the full build plan with phases, types, IPC channels, and acceptance criteria.
2. Read `docs/PRD.md` — it has the product vision and architectural decisions.
3. The `prompts/` directory contains default prompt files that get copied to `~/.quick-launcher/prompts/` on first run. These define the AI's personality and behavior.

## Architecture

- **Electron main process** (`electron/`): Window management, global shortcuts, file watching, SQLite, Gemini API, IPC handlers
- **Renderer** (`src/`): React 19 + TypeScript + Tailwind. Handles UI, keyboard navigation, streaming display.
- **Worker thread** (`electron/worker.ts`): Background indexing and embedding — never blocks the UI.
- **Prompts** (`prompts/`): Composable markdown files assembled at runtime into the system prompt. CORE.md (rules) + SOUL.md (personality) + CONTEXT.md (auto-generated) + skills/*.md (task-specific).

## Key Design Rules

1. **Speed first.** Local search on every keystroke (< 50ms). AI only on `>` prefix or 400ms pause. Never block the UI thread.
2. **Window hide/show, never destroy/recreate.** Keep the renderer alive for instant appearance.
3. **All search in renderer process** where possible (MiniSearch). Avoid IPC round-trips for Tier 0 search.
4. **Stream all AI responses.** Never wait for complete response.
5. **Composable prompts.** Never hardcode system prompts. Always load from `~/.quick-launcher/prompts/` files.
6. **SQLite for everything persistent.** One database at `~/.quick-launcher/launcher.db` for interactions, note access, embeddings, working memory.
7. **Selective skill injection.** Don't stuff all skills into every prompt — detect which skill is relevant and inject only that one.

## Build Commands

```bash
npm run dev          # Start electron in dev mode with hot reload
npm run build        # Build for production
npm run start        # Run production build
```

## Dependencies

See `PLAN.md` for the full tech stack. Key ones:
- `electron`, `electron-vite` (or `vite` + `esbuild`)
- `react`, `react-dom`, `tailwindcss`
- `minisearch` (local fuzzy search)
- `better-sqlite3` (SQLite)
- `@google/generative-ai` (Gemini SDK)
- `chokidar` (file watching)
- `gray-matter`, `marked` (markdown parsing)

## Prompt Files

The `prompts/` directory contains the default AI personality. On first run, these are copied to `~/.quick-launcher/prompts/`. The user can edit them to tune the personality.

- `CORE.md` — Non-negotiable rules (always loaded)
- `SOUL.md` — Personality and voice (always loaded, user-editable)
- `skills/*.md` — Task-specific playbooks (selectively loaded based on query type)
- `CONTEXT.md` — Auto-generated at runtime (vault structure, active projects, recent activity)

## Environment

Requires `GEMINI_API_KEY` and `VAULT_PATH` either as env vars or in `~/.quick-launcher/config.toml`.
