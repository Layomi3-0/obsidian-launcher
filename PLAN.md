# Quick Launcher — Build Plan

> This document is the single source of truth for building Quick Launcher.
> Any LLM or developer should be able to follow this plan end-to-end.

## What Is This?

An AI-powered system-wide launcher for macOS (Electron) that deeply integrates with an Obsidian vault. It replaces Spotlight with something that has:
1. **Instant local search** (fuzzy + full-text + semantic) over your notes
2. **AI-powered answers** (Gemini 3.1 Pro) that cite your actual notes
3. **Persistent memory** across sessions — it knows what you worked on yesterday
4. **A distinct personality** loaded from editable markdown files (not hardcoded)

Read `docs/PRD.md` for the full product vision. This file is the step-by-step build guide.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop shell | Electron v35+ | Already in use, global shortcuts, system tray, macOS integration |
| Frontend | React 19 + TypeScript | Fast iteration, large ecosystem |
| Styling | Tailwind CSS 4 | Utility-first, easy to make it look good fast |
| Bundler | Vite | Fast HMR, good Electron support via `electron-vite` |
| Local search | MiniSearch | Lightweight, fast fuzzy + full-text in the browser |
| Database | better-sqlite3 | Synchronous SQLite from Node — fast, no async overhead |
| Vector search | sqlite-vec (extension) | Vector similarity in SQLite — no separate vector DB |
| Embeddings | Gemini Embedding API (default), local fallback via @xenova/transformers | Embed notes for semantic search |
| AI | Gemini 3.1 Pro via @google/generative-ai SDK | Streaming, long context, available on corp |
| File watching | chokidar | Battle-tested file watcher for vault changes |
| Markdown parsing | marked + gray-matter | Parse frontmatter + render markdown |
| IPC | Electron contextBridge + ipcMain/ipcRenderer | Secure main<->renderer communication |

---

## Project Structure

```
quick-launcher/
  +-- electron/
  |   +-- main.ts              # Electron main process: window, shortcuts, tray, IPC handlers
  |   +-- preload.ts           # contextBridge exposing API to renderer
  |   +-- worker.ts            # Worker thread: indexing, embedding, compaction
  |   +-- services/
  |       +-- vault.ts         # Vault file watcher + markdown parser
  |       +-- search.ts        # MiniSearch index management
  |       +-- memory.ts        # SQLite: interaction history, working memory, embeddings
  |       +-- ai.ts            # Gemini API: prompt assembly, streaming, RAG
  |       +-- prompts.ts       # Load and compose prompt files (CORE, SOUL, CONTEXT, skills)
  |       +-- clipboard.ts     # Clipboard history manager
  |       +-- context.ts       # CONTEXT.md auto-generator (vault stats, active projects, calendar)
  +-- src/
  |   +-- App.tsx              # Root component
  |   +-- components/
  |   |   +-- SearchInput.tsx  # The main search bar
  |   |   +-- ResultsList.tsx  # Ranked results with categories
  |   |   +-- ResultItem.tsx   # Individual result row
  |   |   +-- PreviewPane.tsx  # Markdown preview + AI streaming response
  |   |   +-- AIResponse.tsx   # Streaming AI response with citations
  |   |   +-- EmptyState.tsx   # Context-aware empty state (morning briefing, suggestions)
  |   |   +-- StatusBar.tsx    # Bottom bar: mode indicator, latency, shortcuts hint
  |   +-- hooks/
  |   |   +-- useSearch.ts     # Manages tiered search (fuzzy -> full-text -> AI)
  |   |   +-- useSession.ts    # Short-term memory: session context, recent queries
  |   |   +-- useKeyboard.ts   # Keyboard navigation (up/down, enter, tab, escape)
  |   +-- lib/
  |   |   +-- ipc.ts           # Typed IPC wrapper for calling main process
  |   |   +-- types.ts         # Shared types: SearchResult, Action, Note, Memory, etc.
  |   +-- index.html
  |   +-- main.tsx             # React entry point
  |   +-- styles.css           # Tailwind entry + custom styles (vibrancy, animations)
  +-- prompts/                 # Default prompt files (copied to ~/.quick-launcher/prompts/ on first run)
  |   +-- CORE.md
  |   +-- SOUL.md
  |   +-- skills/
  |       +-- summarize.md
  |       +-- daily-briefing.md
  |       +-- meeting-prep.md
  |       +-- capture.md
  |       +-- connection-discovery.md
  +-- docs/
  |   +-- PRD.md               # Full product requirements document
  +-- PLAN.md                  # This file
  +-- CLAUDE.md                # Instructions for AI assistants working on this codebase
  +-- package.json
  +-- tsconfig.json
  +-- electron-builder.json    # Electron packaging config
  +-- vite.config.ts
  +-- tailwind.config.ts
```

---

## Build Phases

### Phase 0: Project Scaffold
**Goal:** Electron app opens a window with a search bar from a global hotkey.

Steps:
1. Initialize the project: `npm init -y`
2. Install core dependencies:
   ```
   npm i electron electron-vite react react-dom
   npm i -D typescript @types/react @types/react-dom tailwindcss vite
   ```
3. Set up `electron-vite` config (or manual Vite + esbuild for electron main/preload)
4. Create `electron/main.ts`:
   - Create a frameless, transparent `BrowserWindow` (~600px wide, centered)
   - Register a global shortcut (`Cmd+Shift+Space`) to toggle show/hide
   - On hide: `win.hide()`. On show: `win.show()` + `win.focus()`. NEVER destroy and recreate.
   - Set `skipTaskbar: true`, `alwaysOnTop: true`, `vibrancy: 'under-window'`
   - Hide dock icon: `app.dock.hide()`
5. Create `electron/preload.ts` with contextBridge exposing:
   - `launcher.search(query)` -> IPC to main
   - `launcher.executeAction(actionId)` -> IPC to main
   - `launcher.getSessionContext()` -> IPC to main
   - `launcher.onStreamChunk(callback)` -> IPC listener for AI streaming
6. Create `src/App.tsx` with a text input that auto-focuses on mount
7. Create `src/components/SearchInput.tsx` — styled input with Tailwind
8. Verify: press hotkey -> window appears -> type -> text shows -> Escape -> window hides

**Acceptance criteria:** Window appears in < 200ms from hotkey. Input is focused. Escape hides.

---

### Phase 1: Local Search (Snappy)
**Goal:** Typing in the search bar instantly shows matching Obsidian notes.

Steps:
1. Install: `npm i minisearch chokidar gray-matter marked better-sqlite3`
2. Create `electron/services/vault.ts`:
   - Accept a vault path from config
   - Use `chokidar` to watch `**/*.md` recursively
   - On file change/add: parse with `gray-matter` (frontmatter) + extract title, headings, tags, body
   - Expose a `getNote(path)` and `getAllNotes()` method
   - Emit events: `note:added`, `note:changed`, `note:removed`
3. Create `electron/services/search.ts`:
   - Initialize a `MiniSearch` instance with fields: `title`, `tags`, `headings`, `body`
   - On vault events, add/update/remove documents from the index
   - Expose `search(query: string): SearchResult[]` — returns top 10, ranked by score
   - Add boost weights: title (10x), tags (5x), headings (3x), body (1x)
4. Wire up IPC: `launcher.search(query)` calls `search.ts` and returns results
5. Create `src/components/ResultsList.tsx` + `ResultItem.tsx`:
   - Render results as a list with title, path, and matched snippet
   - Highlight matched terms
   - Keyboard navigation: up/down arrows move selection, Enter executes
6. Create `src/hooks/useSearch.ts`:
   - On every keystroke, call `launcher.search(query)` via IPC
   - Debounce is NOT needed for local search — fire on every keystroke
   - Store results in state, render immediately
7. Create `src/hooks/useKeyboard.ts`:
   - Track `selectedIndex` state
   - Arrow up/down: move selection
   - Enter: execute action (open in Obsidian via `obsidian://open?vault=...&file=...`)
   - Escape: clear input and hide window
   - Tab: toggle preview pane
8. Create `src/components/PreviewPane.tsx`:
   - When Tab is pressed, show a side panel with the selected note's markdown rendered via `marked`
   - Slide-in animation (120ms ease-out)

**Acceptance criteria:**
- Typing shows results in < 50ms
- Results are relevant (title matches rank highest)
- Enter opens the note in Obsidian
- Keyboard navigation works fluidly

---

### Phase 2: Memory System
**Goal:** The launcher remembers interactions across sessions and uses them for smarter results.

Steps:
1. Create `electron/services/memory.ts`:
   - Initialize `better-sqlite3` database at `~/.quick-launcher/launcher.db`
   - Create tables:
     ```sql
     CREATE TABLE interactions (
       id INTEGER PRIMARY KEY,
       timestamp TEXT NOT NULL,
       query TEXT NOT NULL,
       result_clicked TEXT,  -- note path or action ID
       ai_response TEXT,
       session_id TEXT NOT NULL
     );

     CREATE TABLE note_access (
       note_path TEXT NOT NULL,
       access_count INTEGER DEFAULT 1,
       last_accessed TEXT NOT NULL,
       PRIMARY KEY (note_path)
     );

     CREATE TABLE embeddings (
       note_path TEXT PRIMARY KEY,
       embedding BLOB NOT NULL,  -- Float32Array as buffer
       last_embedded TEXT NOT NULL
     );

     CREATE TABLE working_memory (
       key TEXT PRIMARY KEY,
       value TEXT NOT NULL,
       updated_at TEXT NOT NULL
     );
     ```
   - Methods:
     - `logInteraction(query, resultClicked, aiResponse, sessionId)`
     - `getRecentInteractions(limit)` -> last N interactions
     - `logNoteAccess(notePath)` -> increment access_count, update last_accessed
     - `getNoteAccessScores()` -> all notes with frecency scores
     - `setWorkingMemory(key, value)` / `getWorkingMemory(key)`
     - `storeEmbedding(notePath, embedding)` / `getEmbedding(notePath)`
     - `searchEmbeddings(queryEmbedding, limit)` -> top N by cosine similarity
2. Update the ranking algorithm in `search.ts`:
   ```
   finalScore = (searchScore * 0.45)
              + (frecency * 0.25)
              + (recency * 0.15)
              + (contextBonus * 0.15)
   ```
   - `frecency`: from `note_access` table — combines frequency and recency
   - `recency`: exponential decay on last modified time (half-life = 7 days)
   - `contextBonus`: boost if note shares tags/links with the last-opened note
3. Implement session context in `src/hooks/useSession.ts`:
   - Generate a `sessionId` on launcher open
   - Track last 5 queries and results in-memory
   - Expose `getSessionContext()` for AI prompts
4. After each interaction (Enter pressed, AI response received):
   - Call `memory.logInteraction(...)` via IPC
   - Call `memory.logNoteAccess(...)` if a note was opened

**Acceptance criteria:**
- Frequently opened notes rank higher over time
- Recent queries are accessible in session context
- Database persists across app restarts

---

### Phase 3: AI Integration (Gemini + RAG)
**Goal:** Prefix with `>` or pause typing to get AI answers grounded in your vault.

Steps:
1. Install: `npm i @google/generative-ai`
2. Create `electron/services/prompts.ts`:
   - On startup, check if `~/.quick-launcher/prompts/` exists. If not, copy defaults from repo's `prompts/` directory.
   - `loadPrompt(name: string): string` — read a prompt file from the user's prompts directory
   - `assembleSystemPrompt(skillName?: string): string` — compose CORE + SOUL + CONTEXT + optional skill
   - `loadSkill(query: string): string | null` — pattern match query to determine which skill to inject:
     - `/briefing` or first invocation of day -> `skills/daily-briefing.md`
     - `/capture` -> `skills/capture.md`
     - `/prep` -> `skills/meeting-prep.md`
     - `summarize [[...]]` -> `skills/summarize.md`
     - Default: null (no skill)
3. Create `electron/services/ai.ts`:
   - Initialize Gemini client with API key from env or config
   - `streamQuery(query, context): AsyncGenerator<string>`:
     - Assemble system prompt via `prompts.assembleSystemPrompt(skill)`
     - Build user message with: query + retrieved vault chunks + session history
     - Call Gemini with `generateContentStream()`
     - Yield each chunk as it arrives
   - `embedText(text): Promise<number[]>`:
     - Call Gemini embedding API
     - Return embedding vector
4. Implement RAG pipeline in `ai.ts`:
   - `getRelevantContext(query): Promise<string[]>`:
     1. Embed the query
     2. Search `memory.searchEmbeddings(queryEmbedding, 5)` for top 5 semantically similar notes
     3. Also run `search.search(query)` for top 5 keyword matches
     4. Merge and deduplicate
     5. For each note, extract the most relevant chunk (~500 tokens)
     6. Return chunks as context strings
5. Create `electron/services/context.ts`:
   - Auto-generate `CONTEXT.md` at `~/.quick-launcher/prompts/CONTEXT.md`
   - Rebuild on: app start, vault change (debounced 30s), and daily at midnight
   - Contents: vault structure summary, active projects (recently modified), open loops (unchecked tasks), recent interaction summary
6. Update `src/hooks/useSearch.ts`:
   - If query starts with `>`, switch to AI mode immediately
   - If user stops typing for 400ms and no confident local match, trigger AI mode
   - In AI mode: show a pulsing dot indicator, then stream the response
7. Create `src/components/AIResponse.tsx`:
   - Renders streaming markdown with `marked`
   - Detects `[[wikilinks]]` in response and makes them clickable (open in Obsidian)
   - Shows a "Capture to vault" button after response completes
8. Wire up IPC for streaming:
   - Main process: on `ai:query`, run `streamQuery()`, send each chunk via `win.webContents.send('ai:chunk', chunk)`
   - Preload: expose `launcher.onStreamChunk(callback)`
   - Renderer: `useSearch` hook accumulates chunks and renders in `AIResponse`

**Acceptance criteria:**
- `>what is CQRS` returns a Gemini answer citing vault notes within 2s
- Streaming shows first token in < 1s
- [[wikilinks]] in responses are clickable
- "Capture to vault" button works (creates a new note with the AI response)

---

### Phase 4: Embeddings & Semantic Search
**Goal:** Notes are embedded for semantic search. "That distributed systems paper" finds the right note even without exact keywords.

Steps:
1. In `electron/worker.ts`, create a worker thread that:
   - On startup: check which notes need embedding (new or modified since last embed)
   - For each note needing embedding: call `ai.embedText(noteContent)`, store via `memory.storeEmbedding()`
   - Run this in batches of 10 with a delay to avoid rate limiting
   - Re-run when file watcher detects changes (debounced 5s)
2. Update search flow:
   - Tier 0 (< 30ms): MiniSearch fuzzy — fires on every keystroke
   - Tier 1 (< 200ms): After 200ms idle, ALSO run semantic search:
     - Embed query via `ai.embedText(query)`
     - `memory.searchEmbeddings(queryEmbedding, 5)`
     - Merge with fuzzy results, re-rank with composite score
   - Tier 2 (AI): Unchanged from Phase 3
3. Implement cosine similarity in SQLite:
   - If `sqlite-vec` extension is available, use it for vector search
   - Fallback: load all embeddings into memory, compute cosine similarity in JS (fine for < 1000 notes)

**Acceptance criteria:**
- "that paper about consensus algorithms" finds [[Raft Notes]] even if "consensus" isn't in the title
- Semantic results merge smoothly with fuzzy results
- Embedding happens in background without blocking UI

---

### Phase 5: Soul & Polish
**Goal:** The launcher has personality, contextual empty states, and feels like *your* tool.

Steps:
1. Create `src/components/EmptyState.tsx`:
   - On first invocation of the day: show morning context via `/briefing` skill
   - Otherwise: show active project context + one proactive suggestion
   - If clipboard has code: show "Explain this code?" suggestion
   - Fall back to "recently accessed notes" if nothing better
2. Run soul calibration:
   - Create a one-time setup command (CLI or first-run flow)
   - Reads vault structure + 10-15 sample notes
   - Sends to Gemini with the soul calibration prompt (see `prompts/` README)
   - Saves output to `~/.quick-launcher/memory/PROFILE.md`
3. Implement `/feedback` command:
   - User types `/feedback this was too verbose`
   - Append feedback to `~/.quick-launcher/memory/PREFERENCES.md`
   - PREFERENCES.md is loaded into context on every AI call
4. Implement `/forget` command:
   - `/forget last query` — delete the most recent interaction
   - `/forget topic X` — delete all interactions mentioning X
5. Add latency instrumentation:
   - Time every phase: hotkey->visible, keystroke->results, query->first-token
   - Log to `~/.quick-launcher/logs/launcher.log`
   - Show in StatusBar during dev mode
6. Visual polish:
   - Window: translucent dark background, 12px border radius, blur effect
   - Results: fade-in animation (80ms), selected item highlight
   - AI streaming: characters appear with a subtle typewriter feel
   - Pulsing dot (not spinner) for AI thinking state
   - Smooth transitions between search results and AI response
7. Implement daily memory log:
   - At end of each session, write a summary to `~/.quick-launcher/memory/daily/YYYY-MM-DD.md`
   - Format: queries asked, notes opened, AI insights generated
   - Used for "what was I looking at last Tuesday?" type queries

**Acceptance criteria:**
- Opening the launcher with no query shows useful, personalized context
- AI responses have the personality defined in SOUL.md
- `/feedback` and `/forget` commands work
- It feels noticeably different from a generic ChatGPT wrapper

---

### Phase 6: Additional Features (Post-MVP)

These are NOT required for the initial build. Add them after the core is solid.

- [ ] Clipboard manager with history and search
- [ ] Google Calendar integration (show agenda, join meetings)
- [ ] System actions (open app, switch app)
- [ ] Snippet/text expansion system
- [ ] Window management shortcuts
- [ ] Connection discovery (proactive "you might also want" after opening a note)
- [ ] Meeting prep skill (triggered from calendar events)
- [ ] Compaction: auto-summarize old daily memory logs into PROFILE.md updates

---

## Key IPC Channels

| Channel | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `search:query` | renderer -> main | `{ query: string }` | Trigger local search |
| `search:results` | main -> renderer | `SearchResult[]` | Return search results |
| `ai:query` | renderer -> main | `{ query: string, sessionContext: SessionContext }` | Trigger AI query |
| `ai:chunk` | main -> renderer | `{ chunk: string, done: boolean }` | Stream AI response chunks |
| `note:open` | renderer -> main | `{ path: string }` | Open note in Obsidian |
| `note:preview` | renderer -> main | `{ path: string }` | Get rendered note content |
| `note:preview:result` | main -> renderer | `{ html: string }` | Return rendered content |
| `memory:log` | renderer -> main | `{ query, result, sessionId }` | Log an interaction |
| `session:context` | renderer -> main | `void` | Request session context |
| `session:context:result` | main -> renderer | `SessionContext` | Return session context |
| `window:hide` | renderer -> main | `void` | Hide the launcher window |
| `capture:note` | renderer -> main | `{ content, suggestedPath }` | Save AI response as note |

---

## Key Types

```typescript
interface SearchResult {
  path: string;           // Relative to vault root
  title: string;
  snippet: string;        // Matched text excerpt
  score: number;          // Composite score (0-1)
  matchType: 'fuzzy' | 'fulltext' | 'semantic';
  tags: string[];
  lastModified: string;   // ISO date
}

interface SessionContext {
  sessionId: string;
  recentQueries: { query: string; timestamp: string }[];
  lastNoteOpened: string | null;
  clipboardPreview: string | null;  // First 200 chars
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  isFirstInvocationToday: boolean;
}

interface Note {
  path: string;
  title: string;
  content: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  headings: string[];
  links: string[];         // [[wikilinks]] found in content
  lastModified: string;
}

interface Interaction {
  id: number;
  timestamp: string;
  query: string;
  resultClicked: string | null;
  aiResponse: string | null;
  sessionId: string;
}

interface WorkingMemory {
  activeProjects: string[];      // Recently modified project folders
  recentTopics: string[];        // Topics from last 7 days of queries
  openLoops: { note: string; task: string }[];  // Unchecked tasks
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Gemini API key for AI queries and embeddings |
| `VAULT_PATH` | Yes | Absolute path to Obsidian vault |
| `LAUNCHER_DEV` | No | Set to `1` to show latency instrumentation in UI |

These can also be set in `~/.quick-launcher/config.toml`:
```toml
[general]
vault_path = "/path/to/your/vault"
hotkey = "CommandOrControl+Shift+Space"
theme = "dark"

[ai]
gemini_api_key = "your-key-here"
model = "gemini-2.5-pro"
max_tokens = 2048
temperature = 0.7

[memory]
max_daily_logs = 90       # Days of daily logs to keep
compaction_interval = 7   # Days between compaction runs

[search]
boost_title = 10
boost_tags = 5
boost_headings = 3
frecency_halflife_days = 7
```

---

## Testing Strategy

- **Unit tests** for: search ranking, prompt assembly, memory CRUD, vault parsing
- **Integration tests** for: RAG pipeline (embed -> search -> prompt -> response), session context flow
- **Manual testing checklist:**
  - [ ] Hotkey summons/dismisses window
  - [ ] Typing shows instant local results
  - [ ] Enter opens correct note in Obsidian
  - [ ] `>` prefix triggers AI mode with streaming
  - [ ] AI responses cite [[wikilinks]] correctly
  - [ ] "Capture to vault" creates a properly formatted note
  - [ ] Frecency ranking improves over time
  - [ ] Session context (follow-up queries) works
  - [ ] Empty state shows relevant context
  - [ ] `/briefing`, `/capture`, `/feedback`, `/forget` commands work
  - [ ] App survives restart with memory intact
