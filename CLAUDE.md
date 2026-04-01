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

## Clean Code Principles

When writing code, strictly follow these Clean Code principles.

### Foundational Rules

1. **Code without tests is not clean** - Always write tests first or alongside production code
2. **Clean code reads like well-written prose** - Make it simple, direct, and expressive
3. **Focus on three key aspects**:
   - Reduced duplication (DRY principle)
   - High expressiveness (meaningful names, clear intent)
   - Tiny abstractions (small, focused units)

### Naming Conventions

- Use **intent-revealing names** - the name should answer why it exists, what it does, and how it's used
- **Classes**: Use nouns or noun phrases (e.g., Customer, Account, AddressParser)
- **Methods**: Use verbs or verb phrases (e.g., postPayment, deletePage, save)
- Make names **pronounceable and searchable**
- **Pick one word per concept** - don't mix fetch, retrieve, and get for the same operation

### Functions

- **Functions should be small** - ideally 2-4 lines, rarely more than 20 lines
- **Do ONE thing** - functions should do one thing, do it well, and do it only
- **Ideal argument count: 0-2** - avoid 3+ arguments
- **Never use flag arguments** (boolean parameters)
- **Command Query Separation** - functions should either do something OR answer something, not both
- **Don't Repeat Yourself (DRY)** - eliminate duplication

#### One Level of Abstraction Per Function

**A function should do one thing at one level of abstraction.** Think in terms of "distance from the problem domain":

| Level    | Example                      | Meaning               |
| -------- | ---------------------------- | --------------------- |
| High     | "Register user"              | Business intent       |
| Medium   | "Validate email"             | Domain operation      |
| Low      | `if (email.contains("@"))`   | Implementation detail |
| Very Low | `charAt(3)`                  | Mechanical detail     |

**Mixing these levels in one function is problematic** - your brain keeps switching gears (Uncle Bob calls this "mental stack pollution").

**Bad example (mixed levels):**
```java
void registerUser(HttpRequest request) {
    String email = request.getBody().get("email");  // Low-level HTTP detail
    if (!email.contains("@")) { throw new IllegalArgumentException(); }  // Low-level validation
    User user = new User(email, Status.ACTIVE);     // Domain construction
    userRepository.save(user);                      // Persistence detail
}
```

**Good example (single level):**
```java
void registerUser(RegisterUserRequest request) {
    User user = createUser(request);
    saveUser(user);
    notifyUser(user);
}
```
Every line answers: "What does registering a user mean?" - no sudden drops into implementation detail.

#### The Step-Down Rule

**Code should read like a top-down narrative.** We want to read the program as a set of TO paragraphs:

- **Top level:** "TO register the user..."
- **Next level:** "TO create the user... TO save the user... TO notify the user..."
- **Next level:** "TO validate email... TO construct value objects..."

**You step down gradually—never abruptly.** Each function should be followed by those at the next level of abstraction. Your program should read like a well-written document where each section explains WHAT is happening and points to lower sections for HOW.

**Quick tests for abstraction violations:**
1. "Does any line feel like it belong in a different function?"
2. "Would I explain this line to a junior developer using different vocabulary?"

If yes → abstraction leak.

**One-sentence takeaway:** A function should tell one story, using one vocabulary, at one zoom level.

### General Rules

- **Follow the Boy Scout Rule**: Leave the code cleaner than you found it
- **Avoid over-engineering**: Only make changes that are directly requested or clearly necessary
- **No premature optimization**: Don't add configurability, abstractions, or helpers for hypothetical future needs
- **Trust internal code**: Only validate at system boundaries (user input, external APIs)
- **Three similar lines are better than a premature abstraction**
- **Delete unused code completely** - no backwards-compatibility hacks
