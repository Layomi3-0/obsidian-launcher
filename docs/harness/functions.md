# Functions

Functions are verbs. They do one thing, at one abstraction level, and tell one story.

## Size

- **Target: 2–4 lines.** Most functions should fit here.
- **Acceptable: up to 20 lines.** For complex orchestration.
- **Never exceed 40 lines.** If you're there, extract.
- **Indent depth: 1–2 levels max.** Blocks inside `if`/`else`/`for` should be one-line function calls.

## Do One Thing

A function does one thing if you can describe it in a single TO paragraph and every step is one level below the function's name.

```typescript
// One thing: assembling the system prompt
function assembleSystemPrompt(query: string): string {
  const core = loadCoreRules()
  const soul = loadSoulPersonality()
  const skill = selectSkill(query)
  return combinePromptParts(core, soul, skill)
}
```

**Test:** If you can extract a sub-function with a name that isn't just a restatement of its implementation, the original function is doing more than one thing.

## One Level of Abstraction Per Function

Every line in a function should belong to the same "zoom level." Never mix business intent with implementation detail.

| Level | Example | Meaning |
|---|---|---|
| High | `indexVaultNotes()` | Business intent |
| Medium | `parseNoteMetadata(file)` | Domain operation |
| Low | `path.extname(file) === '.md'` | Implementation detail |
| Very low | `buffer.slice(0, 3)` | Mechanical detail |

**Bad — mixed levels:**

```typescript
async function handleQuery(query: string) {
  const trimmed = query.trim()                          // low-level string op
  if (trimmed.startsWith('>')) {                        // low-level parsing
    const response = await callGemini(trimmed.slice(1)) // medium: API call
    mainWindow.webContents.send('stream', response)     // low-level IPC detail
  } else {
    const results = miniSearch.search(trimmed)          // medium: search
    return results.slice(0, 10)                         // low-level array op
  }
}
```

**Good — single level:**

```typescript
async function handleQuery(query: string): QueryResponse {
  const parsed = parseQuery(query)
  if (parsed.isAIQuery) {
    return streamAIResponse(parsed)
  }
  return searchLocally(parsed)
}
```

Each line answers: "What does handling a query mean?" Details live one level down.

## The Step-Down Rule

Code reads like a top-down narrative. Each function is followed by the functions it calls, descending one abstraction level at a time.

```
TO handle a query:
  parse it, decide if it's AI or local, dispatch accordingly.

TO parse a query:
  trim whitespace, detect the > prefix, extract the search term.

TO stream an AI response:
  assemble the prompt, call the API, pipe chunks to the renderer.
```

You step down gradually — never abruptly. The program reads like a newspaper: headline, synopsis, details.

## Arguments

| Count | Name | Guidance |
|---|---|---|
| 0 | Niladic | Ideal |
| 1 | Monadic | Good — asking a question or transforming input |
| 2 | Dyadic | Acceptable — consider if one arg should be `this` |
| 3+ | Polyadic | Wrap arguments in an object |

```typescript
// Bad — too many arguments
function createNote(title: string, content: string, tags: string[], project: string) { ... }

// Good — wrapped in a concept
function createNote(draft: NoteDraft) { ... }
```

### No Boolean Arguments

A boolean parameter means the function does two things. Split it.

```typescript
// Bad
function renderResult(result: SearchResult, isCompact: boolean) { ... }

// Good
function renderResult(result: SearchResult) { ... }
function renderCompactResult(result: SearchResult) { ... }
```

### Transform via Return, Not Output Arguments

If a function transforms its input, return the result. Never mutate an argument to "return" data through it.

```typescript
// Bad
function enrichNote(note: Note): void {
  note.wordCount = countWords(note.content)  // mutating the input
}

// Good
function enrichNote(note: Note): EnrichedNote {
  return { ...note, wordCount: countWords(note.content) }
}
```

## No Side Effects

A function promises to do one thing. It must not secretly do another.

```typescript
// Bad — checkPassword secretly initializes a session
function checkPassword(user: User, password: string): boolean {
  const valid = verify(user.hash, password)
  if (valid) { Session.initialize(user) }  // hidden side effect
  return valid
}

// Good — name reflects what it does
function authenticateAndStartSession(user: User, password: string): Session { ... }
```

If a temporal coupling exists, put it in the name.

## Command Query Separation

A function either **does something** (command) or **answers something** (query). Never both.

```typescript
// Bad — sets and returns
function setVaultPath(path: string): boolean { ... }

// Good — separated
function setVaultPath(path: string): void { ... }
function isVaultPathValid(path: string): boolean { ... }
```

## Prefer Exceptions to Error Codes

Extract `try`/`catch` bodies into their own functions. A function that handles errors should do nothing else.

```typescript
// Good
async function indexVault(): void {
  try {
    await performIndexing()
  } catch (error) {
    handleIndexingError(error)
  }
}
```

## Switch Statements

Avoid them. When unavoidable, bury them in a factory and use polymorphism so the rest of the system never sees the switch.

```typescript
// Bad — switch repeated everywhere
function getIcon(type: ResultType) { switch(type) { ... } }
function getLabel(type: ResultType) { switch(type) { ... } }

// Good — polymorphism via a map or class hierarchy
const resultRenderers: Record<ResultType, ResultRenderer> = {
  note: new NoteRenderer(),
  project: new ProjectRenderer(),
  action: new ActionRenderer(),
}
```

## DRY

If you see the same pattern three times, extract it. Duplication is the root of all evil in software — it means intent is not well expressed.
