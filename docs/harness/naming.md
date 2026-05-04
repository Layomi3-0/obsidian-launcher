# Naming

Names are the primary vehicle for expressiveness. A good name eliminates the need for comments. A bad name forces the reader to study the algorithm.

## Core Rule

**Every name must reveal intent.** It should answer: why does this exist, what does it do, how is it used?

Context should come from the name, not the algorithm. Code should be a quick skim, not an intense study.

## TypeScript Conventions

| Thing | Style | Example |
|---|---|---|
| Variable | camelCase noun | `activeProject`, `searchResults` |
| Function | camelCase verb | `buildPrompt`, `indexNotes`, `parseVaultPath` |
| Boolean | camelCase predicate | `isStreaming`, `hasResults`, `shouldReindex` |
| Type / Interface | PascalCase noun | `SearchResult`, `VaultNote`, `PromptConfig` |
| Enum | PascalCase noun, PascalCase members | `SearchTier.Local`, `WindowState.Hidden` |
| Constant | SCREAMING_SNAKE | `MAX_RESULTS`, `DEBOUNCE_MS` |
| React component | PascalCase noun | `ResultList`, `SearchInput`, `StreamingResponse` |
| Hook | camelCase, `use` prefix | `useSearch`, `useVaultNotes`, `useStreamingAI` |
| File | kebab-case matching export | `search-result.ts`, `vault-note.ts` |
| Test file | same name + `.test` | `search-result.test.ts` |

## Rules

### Classes Are Nouns, Methods Are Verbs

```typescript
// Good
class NoteIndexer { ... }
class PromptAssembler { ... }
function indexVaultNotes() { ... }
function assembleSystemPrompt() { ... }

// Bad — verb as class name
class ManageNotes { ... }
// Bad — noun as method name
function noteIndex() { ... }
```

### Accessors Use `get` / `set` / `is`

```typescript
getActiveProject()
setVaultPath(path)
isIndexingComplete()
```

### One Word Per Concept

Pick one word and stick with it across the entire codebase. Check [vocabulary.md](vocabulary.md) before naming.

```typescript
// Bad — three words for the same concept
fetchNotes()    // in one file
retrieveNotes() // in another
getNotes()      // in a third

// Good — one word everywhere
getNotes()
getProjects()
getEmbeddings()
```

### No Noise Words

`Info`, `Data`, `Object`, `Manager`, `Processor`, `Handler` are noise unless they carry distinct meaning.

```typescript
// Bad
interface NoteData { ... }      // How is this different from Note?
class NoteManager { ... }       // What does "manage" mean?
type SearchResultInfo { ... }   // Info adds nothing

// Good
interface Note { ... }
class NoteIndexer { ... }       // Specific: it indexes
type SearchResult { ... }
```

### No Encodings

No Hungarian notation. No `I` prefix on interfaces. No type in the name.

```typescript
// Bad
interface ISearchService { ... }
const nameString = "vault"
const notesList = [...]

// Good
interface SearchService { ... }
const name = "vault"
const notes = [...]
```

### Name Length Matches Scope

- Loop variable in 3 lines: `i` is fine.
- Module-level constant used everywhere: `REINDEX_DEBOUNCE_MS`.
- The wider the scope, the longer and more descriptive the name.

### No Mental Mapping

The reader should never have to translate a name into something they already know.

```typescript
// Bad — what is `r`? What is `ctx`?
const r = await query(ctx, q)

// Good
const results = await searchVault(searchContext, userQuery)
```

### Meaningful Distinctions

If names must be different, they must mean something different.

```typescript
// Bad — what's the difference?
getNote()
getNoteInfo()
getNoteData()

// Good — each name signals a different thing
getNote()           // the full note object
getNoteMetadata()   // frontmatter only
getNoteContent()    // markdown body only
```

### Add Context Through Structure, Not Prefixes

```typescript
// Bad — prefixing for context
const addressCity = "..."
const addressState = "..."
const addressZip = "..."

// Good — context from structure
interface Address {
  city: string
  state: string
  zip: string
}
```

### Don't Add Gratuitous Context

Don't prefix every name with the project name. Shorter names are better when context is already clear from the module.

```typescript
// Bad — inside electron/services/vault.ts
class BrainDumpVaultService { ... }

// Good
class VaultService { ... }
```
