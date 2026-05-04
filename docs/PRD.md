# Brain Dump — PRD & Design Doc

> Evolving from "launcher with AI" to "second brain with a soul"

---

## Where We Are

Brain Dump is an Electron app on a Google corp laptop that:
- Replaces Spotlight as a system-wide launcher
- Registers global shortcuts
- Connects to an Obsidian vault via Gemini

It works. But it doesn't *feel alive*. Two problems to solve:

1. **It's not snappy enough.** There's perceptible lag — the kind that makes you hesitate before invoking it, which defeats the purpose of a launcher.
2. **It doesn't feel like a second brain.** Right now it's a search box that sometimes calls an LLM. It doesn't *know* you. It doesn't remember what you were working on yesterday. It doesn't proactively surface things you forgot about. It has no continuity.

The thesis: **a tool earns the right to be your second brain by having memory, context, and personality — not just search.**

---

## Objective

Transform Brain Dump from a functional launcher into a tool that feels like an extension of your mind. Three pillars:

| Pillar | What it means | How you'd feel it |
|--------|--------------|-------------------|
| **Snappy** | Every interaction feels instant — no waiting, no spinners, no "let me think" | You invoke it reflexively, like Cmd+C. Zero hesitation. |
| **Memory** | It remembers what you've asked, what you've worked on, what patterns you follow | It greets you with context. It connects dots you didn't ask it to connect. |
| **Soul** | It has a consistent personality, voice, and way of thinking that feels like *your* tool | It doesn't feel like "generic AI assistant." It feels like a thinking partner who knows your world. |

---

## Pillar 1: Snappy

### The Problem

Electron is inherently heavy. But the real bottleneck probably isn't Electron itself — it's the round-trips to Gemini on every query and the lack of local-first processing.

### Strategy: Tiered Response Architecture

Not every query needs AI. Most queries need a fast local answer. AI should be a *layer on top*, not the default path.

```
User types query
       |
       v
  -- Tier 0: Instant (< 30ms) -----------------------
  |  - Fuzzy match over pre-loaded index             |
  |  - Recent actions / frecency-ranked suggestions  |
  |  - Clipboard history                             |
  |  - Static commands (open app, system actions)    |
  --------------------------------+-------------------
                                  | (if no confident match or user keeps typing)
  -- Tier 1: Fast (< 200ms) -------------------------
  |  - Full-text search over vault (local index)     |
  |  - Semantic search with cached embeddings        |
  |  - Tag/link graph traversal                      |
  --------------------------------+-------------------
                                  | (if user pauses 400ms+ or prefixes with ">")
  -- Tier 2: AI (< 2s, streamed) --------------------
  |  - RAG over vault context + Gemini               |
  |  - Conversational follow-ups                     |
  |  - Synthesis / summarization                     |
  ---------------------------------------------------
```

### Concrete Optimizations

#### Pre-warming
- **Keep the renderer process alive.** Don't create/destroy the window on toggle — hide/show it. The DOM stays mounted, React state stays warm.
- **Pre-load the vault index into memory on app start.** A vault with 500 notes should fit in < 20MB of RAM as a search index.
- **Pre-compute top suggestions** based on time of day, recent queries, and current calendar. When you summon the launcher at 9am before your standup, it should already show your standup notes.

#### Local-First Search
- **Build a full-text index** using FlexSearch or MiniSearch in the renderer process (not main process — avoid IPC for search).
- **Cache embeddings locally.** Embed every note once when it changes. Store embeddings in SQLite. Query-time embedding is one API call for the query string, then cosine similarity is pure math — milliseconds.
- **Debounce AI, not local search.** Local fuzzy results should appear on every keystroke. AI only triggers after the user stops typing for 400ms or explicitly asks.

#### Streaming First
- **Always stream Gemini responses.** Never wait for the full response before showing anything. First token should appear in < 800ms.
- **Show a subtle thinking indicator** (pulsing dot, not a spinner) — spinners feel slow, a pulse feels like the tool is *alive*.

#### Electron-Specific
- **Use `BrowserWindow.show()` / `BrowserWindow.hide()`** instead of creating new windows.
- **Disable unnecessary Electron features:** spell check, accessibility tree generation, GPU compositing if not needed.
- **Offload indexing to a worker thread** (Node worker_threads or Web Worker) so the UI thread never blocks.
- **Consider `v8-compile-cache`** to speed up require() times.

---

## Pillar 2: Memory — The Second Brain Layer

This is the biggest gap. Right now the launcher is **stateless** — every invocation starts from zero. A second brain has *continuity*.

### Memory Architecture

```
+----------------------------------------------+
|              Memory System                    |
+--------------+--------------+----------------+
|  Short-Term  |  Working     |  Long-Term     |
|  Memory      |  Memory      |  Memory        |
|              |              |                |
|  Current     |  Active      |  Vault index   |
|  session     |  projects    |  + embeddings  |
|  context     |  & threads   |                |
|              |              |  Interaction    |
|  Last 5      |  What you    |  history       |
|  queries     |  care about  |                |
|              |  this week   |  Learned        |
|  Clipboard   |              |  preferences   |
|  recent      |  Open        |                |
|              |  questions   |  Connection     |
|              |              |  graph          |
+--------------+--------------+----------------+
```

### Short-Term Memory (session-scoped, in-memory)

**What it tracks:**
- Last 5 queries and their results in this session
- The app you were in before summoning the launcher
- Your current clipboard contents
- The file you had open (if detectable via accessibility APIs or Obsidian URI)

**How it's used:**
- Follow-up queries understand context: if you searched "system design" and then type "that Netflix paper", it knows you mean the system design note about Netflix.
- If you copy a code snippet and summon the launcher, it can proactively offer "Explain this code?" or "Find related notes."

### Working Memory (persisted daily, SQLite)

**What it tracks:**
- Your active projects (derived from recently modified notes in Projects/ folder)
- Topics you've searched for in the last 7 days (frequency + recency)
- Unfinished threads: questions you asked the AI that you never followed up on
- "Open loops" detected from your notes (e.g., `- [ ]` items, notes tagged #todo)

**How it's used:**
- **Morning briefing** (`/briefing` or auto-shown on first invocation of the day): "You were working on the auth middleware redesign yesterday. You have 3 open tasks in [[Wedding Planning]]. Your 10am is a 1:1 with Sarah."
- **Proactive suggestions**: If you haven't opened a note you were actively editing for 3+ days, surface it as "You might want to revisit [[API Rate Limiting Design]]."
- **Thread continuity**: "Last time you asked about distributed consensus, I pointed you to [[Raft Notes]] and [[PBFT Overview]]. Want to pick up where we left off?"

### Long-Term Memory (persisted permanently, SQLite + embeddings)

**What it tracks:**
- Full vault index with embeddings (rebuilt on file changes)
- Complete interaction history: every query, every result clicked, every AI response
- Learned preferences: topics you care about, notes you return to, your PARA structure habits
- **Connection graph**: a weighted graph of relationships between notes, derived from wikilinks, co-search patterns (notes that get searched together), and semantic similarity

**How it's used:**
- **Smarter ranking**: Notes you open frequently rank higher. Notes connected to your recent work get boosted.
- **"You might also want"**: After opening a note, suggest related notes from the connection graph — not just backlinks, but notes that are *semantically* related or that you historically access together.
- **Pattern recognition**: "You tend to create a design doc before starting implementation. Want me to scaffold one for [[New Auth System]]?"

---

## Pillar 3: Soul — Personality & Voice

A second brain without personality is just a database with a chat interface. "Soul" is the difference between a tool you *use* and a tool you *trust*.

### What "Soul" Means Concretely

#### 1. Consistent Voice
Not "helpful assistant." Not corporate. A thinking partner who is:
- **Direct and concise** — respects your time, doesn't pad responses
- **Intellectually curious** — connects ideas, spots patterns, asks good questions
- **Opinionated when useful** — "I'd start with [[Raft Notes]], it's more practical than the PBFT one for your use case"
- **Honest about limits** — "I don't have anything on this in your vault" rather than vague hand-waving

#### 2. It Knows Your World
Soul means the AI understands your specific context:
- Your PARA structure and what each area means to *you*
- That your spiritual notes and engineering notes are both important, not just the "productive" stuff
- Your naming conventions, your tagging habits, your linking style

#### 3. Micro-Interactions That Create Feel

Soul lives in the small things:

| Moment | Soulless | Soulful |
|--------|----------|---------|
| Empty state (no query) | "Type to search" | Shows your active project context + a subtle suggestion |
| No results | "No results found" | "Nothing in your vault on this. Want to capture a new note?" |
| First use of the day | Same as always | "Morning. You have 3 meetings today. You left off in [[Auth Redesign]]." |
| After a long AI answer | Just the text | Sources cited as clickable [[wikilinks]], with a "Capture this to vault?" action |
| Returning to a topic | Treats it as new | "You last explored this on March 12. Here's where you left off." |
| Note connection found | Doesn't mention it | "This pairs well with [[X]] — similar pattern, different context." |

#### 4. Adaptive Tone

The tool should subtly match the domain:

- **Engineering queries**: Precise, technical, code-friendly.
- **Project management**: Action-oriented.
- **Spiritual/reflective**: Warmer, more contemplative.
- **Quick utility** (clipboard, app switching): Silent. No AI commentary. Just do the thing.

---

## Architecture (Inspired by OpenClaw)

### Composable Prompt System

Instead of one hardcoded system prompt, load personality from user-editable files in `~/.brain-dump/prompts/`. See the `prompts/` directory in this repo for defaults.

The system prompt for each AI call is assembled at runtime:
```
[CORE.md contents]
[SOUL.md contents]
[CONTEXT.md contents — rebuilt daily or on vault changes]
[Relevant skill file — only if the query matches a skill pattern]
[Dynamic context — session history, memory search results, calendar]
```

You can iterate on the soul *without touching code*. Edit `SOUL.md`, and the next query immediately reflects it.

### Hybrid Memory Search (Vector + BM25)

- Use SQLite + `sqlite-vec` for the vector store — no need for a separate vector DB
- Index every vault note AND every launcher interaction (queries + AI responses)
- On each AI query, run hybrid search and inject the top results as context
- The AI gets smarter over time — it learns from its own interactions with you

### Session Compaction with Memory Flush

```
Session Flow:
  1. User asks something
  2. Launcher answers
  3. After session closes, extract durable facts:
     - "User asked about X" -> add to interaction log
     - "User opened [[Note Y]] from results" -> add to access log
     - "AI discovered connection between A and B" -> add to connection graph
  4. Periodically compact: summarize old interaction logs into
     a condensed "what this user cares about" profile
  5. Profile feeds into CONTEXT.md for future prompts
```

### Selective Skill Injection

Detect query type locally, inject only the relevant skill file:

```
"summarize [[Auth Redesign]]"  -> inject skills/summarize.md
"/briefing"                     -> inject skills/daily-briefing.md
"what did I write about PBFT?"  -> inject skills/vault-search.md (RAG-focused)
"remind me about my 2pm"       -> inject skills/calendar.md
(generic query)                 -> no skill injection, just CORE + SOUL + CONTEXT
```

### Full Architecture Diagram

```
+-------------------------------------------------------------+
|                    Global Hotkey Layer                       |
|                  (Cmd+Shift+Space)                          |
+----------------------------+--------------------------------+
                             |
+----------------------------v--------------------------------+
|                   Electron Main Process                      |
|  +--------------+  +--------------+  +-------------------+  |
|  | Window Mgmt  |  | File Watcher |  | Worker Thread     |  |
|  | (hide/show)  |  | (vault +     |  | (indexing,        |  |
|  |              |  |  memory dir) |  |  embedding,       |  |
|  |              |  |              |  |  compaction)      |  |
|  +--------------+  +--------------+  +-------------------+  |
+----------------------------+--------------------------------+
                             | IPC
+----------------------------v--------------------------------+
|                   Renderer Process                           |
|  +-------------------------------------------------------+  |
|  |  Search Input                                         |  |
|  +-------------------------------------------------------+  |
|  |  Tier 0: Instant Results (in-memory fuzzy index)      |  |
|  |  Tier 1: Full-text + Semantic (SQLite + vectors)      |  |
|  |  Tier 2: AI (streamed, with assembled context)        |  |
|  +-------------------------------------------------------+  |
|  |  Preview Pane / AI Response (streaming)               |  |
|  +-------------------------------------------------------+  |
+----------------------------+--------------------------------+
                             |
          +------------------+------------------+
          v                  v                  v
+----------------+ +----------------+ +------------------+
| Prompt         | | Memory         | | Data Sources     |
| Assembly       | | System         | |                  |
|                | |                | | - Obsidian vault |
| CORE.md        | | SQLite +       | | - Google Calendar|
| + SOUL.md      | | sqlite-vec     | | - Clipboard      |
| + CONTEXT.md   | |                | | - Active app     |
| + skill/*.md   | | Hybrid:        | |   context        |
| (selective)    | | BM25 + Vector  | |                  |
|                | |                | |                  |
| + dynamic:     | | Curated:       | |                  |
|   session      | | PROFILE.md     | |                  |
|   memory       | | PREFS.md       | |                  |
|   calendar     | |                | |                  |
|                | | Auto:          | |                  |
|                | | daily/*.md     | |                  |
+-------+--------+ +----------------+ +------------------+
        |
        v
+----------------+
| Gemini 3.1     |
| Pro API        |
| (streaming)    |
+----------------+
```

---

## Data Storage

```
~/.brain-dump/
  +-- config.toml          # User settings
  +-- launcher.db          # SQLite: clipboard, action history, metadata, embeddings
  +-- prompts/             # Composable prompt files (copied from repo defaults on first run)
  |   +-- CORE.md
  |   +-- SOUL.md
  |   +-- CONTEXT.md       # Auto-generated
  |   +-- skills/
  |       +-- summarize.md
  |       +-- daily-briefing.md
  |       +-- meeting-prep.md
  |       +-- capture.md
  |       +-- connection-discovery.md
  +-- memory/
  |   +-- PROFILE.md       # Curated: user profile from soul calibration
  |   +-- PREFERENCES.md   # Curated: learned preferences
  |   +-- CONNECTIONS.md   # Curated: discovered note connections
  |   +-- daily/
  |       +-- YYYY-MM-DD.md  # Auto: daily interaction logs
  +-- cache/
  |   +-- thumbnails/      # Clipboard image thumbnails
  |   +-- ai_responses/    # Cached AI responses (TTL: 1 hour)
  +-- logs/
      +-- launcher.log     # Rotating log file
```

---

## Metrics

### Snappiness

| Metric | Current (estimate) | Target |
|--------|-------------------|--------|
| Window appear time | ~300-500ms | < 100ms |
| Local search results | ~200-400ms | < 50ms |
| AI first token | ~2-3s | < 1s |
| Memory (idle) | ~150-250MB (Electron) | < 120MB |

### Memory Quality

| Metric | Target |
|--------|--------|
| Follow-up queries resolved without clarification | > 80% |
| Morning briefing accuracy (relevant items surfaced) | > 70% |
| Proactive suggestions acted on (clicked/opened) | > 30% |
| Thread continuity: correctly recalls prior context | > 90% |

### Soul

| Metric | How to measure |
|--------|---------------|
| Daily invocations trending up | Usage logs — if it has soul, you use it more |
| "Capture to vault" actions per week | Are AI responses good enough to keep? |
| Connection suggestions clicked | Are the "you might also want" links useful? |
| Qualitative: does it feel like *yours*? | Weekly self-check — would you miss it if it broke? |

---

## Alternative Approaches / Caveats

### Why not migrate to Tauri?
Tempting, but wrong order. Snappiness issues are likely in the **architecture** (every query hitting Gemini, no local index, window recreation), not Electron itself. Fix the architecture first.

### Why not use a local LLM instead of Gemini?
Local LLMs would eliminate API latency entirely. But the quality gap matters for "soul." Use local models for embeddings only.

### Risk: Memory becoming creepy
Mitigation: proactive suggestions only when confidence is very high. Give the user a `/forget` command to wipe specific memory. Memory is 100% local, inspectable, deletable.

### Risk: Soul prompt drift
Mitigation: build in a `/feedback` command that adjusts the soul prompt. Review the soul calibration quarterly.
