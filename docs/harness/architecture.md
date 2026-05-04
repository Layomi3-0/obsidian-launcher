# Architecture

High-level modules define what the system does. Low-level modules define how. Dependency inversion ensures "how" never dictates "what."

> Details should be plugins to policy.

## Dependency Inversion Principle (DIP)

High-level modules must not depend on low-level modules. Both depend on abstractions.

```typescript
// Bad — business logic depends on a concrete detail
class PromptAssembler {
  private fs = require('fs')  // tied to filesystem
  assemble(query: string): string {
    const core = this.fs.readFileSync('~/.quick-launcher/prompts/CORE.md')
    // ...
  }
}

// Good — depends on an abstraction
interface PromptLoader {
  loadCore(): string
  loadSoul(): string
  loadSkill(name: string): string
}

class PromptAssembler {
  constructor(private loader: PromptLoader) {}
  assemble(query: string): string {
    const core = this.loader.loadCore()
    // ...
  }
}
```

The decision of which `PromptLoader` implementation to use lives at the edge — in a factory or composition root.

## Dependency Injection (DI)

Supply dependencies from the outside. Constructor injection is preferred — it makes dependencies explicit and honest.

```typescript
// Good — constructor injection
class NoteIndexer {
  constructor(
    private parser: NoteParser,
    private repository: NoteRepository,
  ) {}
}

// Bad — hidden dependency
class NoteIndexer {
  private parser = new MarkdownNoteParser()  // hidden, untestable
}
```

Field injection and service locators hide dependencies. Avoid them.

## Factories and Invariants

**Invariants** are rules about an object that must always be true after creation. Make invalid states impossible to represent.

```typescript
// Bad — caller can create invalid state
const config = { vaultPath: '', geminiKey: '' }  // empty = invalid

// Good — factory enforces invariants
class AppConfig {
  private constructor(
    readonly vaultPath: string,
    readonly geminiKey: string,
  ) {}

  static fromEnvironment(): AppConfig {
    const vaultPath = requireEnv('VAULT_PATH')
    const geminiKey = requireEnv('GEMINI_API_KEY')
    return new AppConfig(vaultPath, geminiKey)
  }
}
```

- Entities enforce invariants.
- Factories create objects and inject dependencies.
- Frameworks live at the edges.

## The Law of Demeter

Talk to friends, not strangers. A method should only call methods of:

1. Its own class
2. Objects it created
3. Objects passed as arguments
4. Objects held as instance variables

Never call methods on objects returned by other methods.

```typescript
// Bad — reaching through objects (train wreck)
const city = user.getAddress().getCity().getName()

// Good — tell, don't ask
const city = user.getCityName()
```

## Data Abstraction

Hiding implementation is not just wrapping variables in getters. Expose the **essence** of the data, not its structure.

```typescript
// Bad — reveals implementation (it's a Map internally)
interface NoteCache {
  getMap(): Map<string, Note>
}

// Good — exposes operations, hides structure
interface NoteCache {
  get(id: string): Note | undefined
  has(id: string): boolean
  invalidate(id: string): void
}
```

## Objects vs Data Structures

- **Objects** hide data, expose behavior. Easy to add new types, hard to add new behavior.
- **Data structures** expose data, no behavior. Easy to add new behavior, hard to add new types.

Choose based on what kind of change you expect:

| Expect to add... | Use |
|---|---|
| New types (e.g., new result kinds) | Objects + polymorphism |
| New behavior (e.g., new operations on existing data) | Data structures + functions |

## Controllers

A controller translates external input into a use case call and translates the result back. Controllers:

- Do not contain business rules
- Do not make decisions
- Do not enforce domain invariants
- Do not talk directly to the database

In this Electron app, IPC handlers are controllers:

```typescript
// Good — IPC handler is a thin controller
ipcMain.handle('search', async (_event, query: string) => {
  return searchService.search(query)
})

// Bad — business logic in the handler
ipcMain.handle('search', async (_event, query: string) => {
  const trimmed = query.trim()
  if (trimmed.startsWith('>')) {
    const prompt = assemblePrompt(trimmed)
    return callGemini(prompt)
  }
  return miniSearch.search(trimmed, { limit: 10 })
})
```

## Layered Boundaries

```
src/              → UI layer (React components, hooks)
  ↓ calls via IPC
electron/
  handlers/       → Controllers (thin IPC handlers)
  services/       → Use cases / business logic
  repositories/   → Data access (SQLite, filesystem)
  domain/         → Entities, value objects, interfaces
```

Dependencies point inward. `services/` never imports from `handlers/`. `domain/` never imports from anything.
