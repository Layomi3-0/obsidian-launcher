# Classes & Files

With functions we measure size by lines. With classes, we count responsibilities.

## Size

- **Target: ~250 lines per file.** Beyond this, there is always a hidden class trying to escape.
- **Absolute max: 400 lines.** If you're here, split before doing anything else.
- Count responsibilities, not just lines. A 100-line file with 3 responsibilities is worse than a 200-line file with 1.

## File Organization (Step-Down Rule)

A file reads like a newspaper article: headline at the top, details at the bottom.

```typescript
// 1. Exports / public constants
export const REINDEX_INTERVAL_MS = 300_000

// 2. Types (if co-located)
interface IndexEntry { ... }

// 3. Public functions / class with public methods
export function indexVaultNotes(vaultPath: string): IndexEntry[] {
  const files = discoverMarkdownFiles(vaultPath)
  const parsed = parseAllNotes(files)
  return buildIndex(parsed)
}

// 4. Private helpers — directly below the public function that calls them
function discoverMarkdownFiles(vaultPath: string): string[] { ... }
function parseAllNotes(files: string[]): ParsedNote[] { ... }
function buildIndex(notes: ParsedNote[]): IndexEntry[] { ... }
```

Private utilities sit right after the public function that calls them. Callers above callees.

## Single Responsibility Principle (SRP)

A class or module has **one and only one reason to change.**

**Test:** Can you describe the module in 25 words without using "if," "and," "or," or "but"?

```typescript
// Bad — two reasons to change (parsing logic AND persistence logic)
// vault-service.ts
export class VaultService {
  parseNote(content: string): Note { ... }
  saveNoteToDb(note: Note): void { ... }
  watchForChanges(): void { ... }
}

// Good — separated by responsibility
// note-parser.ts — changes when parsing rules change
export class NoteParser {
  parse(content: string): Note { ... }
}

// note-repository.ts — changes when storage schema changes
export class NoteRepository {
  save(note: Note): void { ... }
}

// vault-watcher.ts — changes when file watching strategy changes
export class VaultWatcher {
  watch(path: string, onChange: (file: string) => void): void { ... }
}
```

> Do you want your tools organized into toolboxes with many small drawers, each well-labeled? Or a few drawers you toss everything into?

## Cohesion

A class is cohesive when every method uses most of the instance variables. When a subset of methods only touches a subset of variables, **there is another class hiding inside.**

```typescript
// Low cohesion — split into two classes
class SearchHandler {
  private miniSearch: MiniSearch      // used by local search methods
  private geminiClient: GeminiClient  // used by AI methods
  private searchHistory: SearchEntry[] // used by history methods

  searchLocal(query: string) { ... }   // uses miniSearch
  searchAI(query: string) { ... }      // uses geminiClient
  getHistory() { ... }                 // uses searchHistory
}

// High cohesion — each class uses all its state
class LocalSearch {
  private miniSearch: MiniSearch
  search(query: string) { ... }
  reindex(notes: Note[]) { ... }
}

class AISearch {
  private geminiClient: GeminiClient
  stream(query: string, prompt: string) { ... }
}
```

## Organizing for Change (OCP)

Classes should be **open for extension, closed for modification.** When adding a new feature means modifying existing code, the design is wrong.

```typescript
// Bad — adding a new result type requires modifying this file
function renderResult(result: SearchResult) {
  switch (result.type) {
    case 'note': return renderNote(result)
    case 'project': return renderProject(result)
    // adding 'action' means changing this file
  }
}

// Good — new types extend, never modify
interface ResultRenderer {
  render(result: SearchResult): ReactNode
}

// Each type in its own file. Adding a new type = adding a new file.
```

## Private Method Smell

A private method used by only one public method is fine — it's a helper. But a private method used by only a **subset** of public methods signals a class waiting to be extracted.

## React Components

React components follow the same rules. A component is a "class" in Clean Code terms.

- **One responsibility per component.** If a component fetches data AND renders UI, split it.
- **Custom hooks extract behavior.** The component renders; the hook orchestrates.
- **~250 lines max** including JSX. If the JSX alone exceeds 80 lines, extract sub-components.

```typescript
// Bad — fetching + rendering + keyboard handling in one component
function SearchPanel() {
  const [results, setResults] = useState([])
  useEffect(() => { /* fetch logic */ }, [])
  useEffect(() => { /* keyboard listener */ }, [])
  return <div>{ /* 100 lines of JSX */ }</div>
}

// Good — separated concerns
function SearchPanel() {
  const { results, search } = useSearch()
  useSearchKeyboard(results)
  return <SearchResults results={results} />
}
```
