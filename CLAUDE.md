# CLAUDE.md — Quick Launcher

## What Is This?

An AI-powered system-wide launcher for macOS built with Electron. It replaces Spotlight and deeply integrates with an Obsidian vault via Gemini 3.1 Pro. The three pillars are: **Snappy** (instant local search, AI only when needed), **Memory** (persistent context across sessions), and **Soul** (consistent personality loaded from editable markdown files).

## Before You Start

1. Read `PLAN.md` — it has the full build plan with phases, types, IPC channels, and acceptance criteria.
2. Read `docs/PRD.md` — it has the product vision and architectural decisions.
3. Read `docs/harness/README.md` — it has the Clean Code harness. All code must pass through these guardrails.
4. The `prompts/` directory contains default prompt files that get copied to `~/.quick-launcher/prompts/` on first run. These define the AI's personality and behavior.

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

## Clean Code Harness

All code must follow the Clean Code harness in `docs/harness/`. The full guides live there — this section is the enforced summary.

**Read the harness:** `docs/harness/README.md` is the entry point.

### Hard Limits

| Constraint | Limit |
|---|---|
| Lines per file | ~250 (max 400) |
| Lines per function | 2–20 (max 40) |
| Function arguments | 0–2 (3+ must wrap in object) |
| Indent depth | 1–2 levels |
| Boolean parameters | 0 — split the function |

### Non-Negotiable Rules

1. **One level of abstraction per function.** Never mix business intent with implementation detail.
2. **One responsibility per file.** If you can't describe it in 25 words without "and"/"or"/"but", split it.
3. **Step-down rule.** Code reads top-down: headline, then details. Callers above callees.
4. **One word per concept.** Check `docs/harness/vocabulary.md` before naming anything.
5. **No side effects.** A function does what its name says. Nothing hidden.
6. **Command Query Separation.** Functions either do something or answer something. Never both.
7. **Tests first.** Code without tests is not clean.
8. **Boy Scout Rule.** Leave every file cleaner than you found it.

### General Rules

- **Avoid over-engineering**: Only make changes that are directly requested or clearly necessary
- **No premature optimization**: Don't add configurability, abstractions, or helpers for hypothetical future needs
- **Trust internal code**: Only validate at system boundaries (user input, external APIs)
- **Three similar lines are better than a premature abstraction**
- **Delete unused code completely** - no backwards-compatibility hacks
