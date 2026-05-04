# Testing

Code without tests is not clean. Tests enable all the "-ilities" — flexibility, maintainability, reusability — because tests enable change.

## The Three Laws of TDD

1. You may not write production code until you have written a failing test.
2. You may not write more of a test than is sufficient to fail — and not compiling is failing.
3. You may not write more production code than is sufficient to pass the currently failing test.

Test and production code are written together, with tests just ahead.

## Clean Tests

The most important quality of tests is **readability.** Clarity, simplicity, and density of expression. Say a lot with as few expressions as possible.

### Given-When-Then

Every test follows this structure:

```typescript
describe('NoteParser', () => {
  it('extracts tags from frontmatter', () => {
    // Given
    const content = '---\ntags: [project, active]\n---\n# My Note'

    // Given
    const note = parser.parse(content)

    // Then
    expect(note.tags).toEqual(['project', 'active'])
  })
})
```

### One Concept Per Test

Each test function tests a single concept. Not a single assert — a single concept. Multiple asserts are fine if they all verify the same concept.

```typescript
// Bad — testing two unrelated concepts
it('parses note and indexes it', () => {
  const note = parser.parse(content)
  expect(note.title).toBe('My Note')       // parsing concept
  expect(index.search('My Note')).toHaveLength(1) // indexing concept
})

// Good — one concept each
it('extracts title from first heading', () => {
  const note = parser.parse(content)
  expect(note.title).toBe('My Note')
})

it('indexes parsed notes by title', () => {
  index.add(note)
  expect(index.search('My Note')).toHaveLength(1)
})
```

### Minimize Asserts

Tests should come to a single conclusion that is quick and easy to understand. Minimize the number of asserts per concept.

## Domain-Specific Testing Language

Build test utilities that make tests more convenient to write and easier to read. This evolves into a testing language.

```typescript
// Build helpers that speak the domain
function aNote(overrides?: Partial<Note>): Note {
  return {
    id: 'test-id',
    title: 'Test Note',
    content: '# Test Note\nSome content',
    tags: [],
    ...overrides,
  }
}

function aVaultWith(...notes: Note[]): TestVault {
  return new TestVault(notes)
}

// Tests read like prose
it('finds notes by tag', () => {
  const vault = aVaultWith(
    aNote({ tags: ['project'] }),
    aNote({ tags: ['daily'] }),
  )
  expect(vault.searchByTag('project')).toHaveLength(1)
})
```

Test utilities don't need to be as efficient as production code. Optimize for readability.

## F.I.R.S.T.

| Principle | Rule |
|---|---|
| **Fast** | Tests run quickly. Slow tests don't get run. Use mocks for external APIs (Gemini, filesystem) |
| **Independent** | Tests don't depend on each other. No shared mutable state. Each test sets up its own world |
| **Repeatable** | Tests work in any environment — CI, laptop, offline. No dependency on network or real filesystem |
| **Self-validating** | Pass or fail. No manual inspection of output. No "looks right to me" |
| **Timely** | Write tests before or alongside production code. Never after. If production code is hard to test, the design is wrong |

## What to Test

- **Services and domain logic:** Always. This is where bugs live.
- **React hooks with logic:** Always. Extract logic into hooks, test the hooks.
- **React components:** Test behavior (what the user sees and does), not implementation.
- **IPC handlers:** Test that they call the right service with the right args. They're thin, so tests are thin.
- **Pure utilities:** Always. They're the easiest to test.
- **Electron window management:** Integration test or manual. Don't mock Electron internals.

## Test File Structure

```
test/
  unit/
    services/          # mirrors electron/services/
    domain/            # mirrors electron/domain/
    hooks/             # mirrors src/hooks/
  integration/
    ipc/               # end-to-end IPC flows
    database/          # real SQLite operations
  helpers/
    builders.ts        # domain-specific test language (aNote, aVault, etc.)
    fixtures.ts        # static test data
```

Tests mirror the source tree. Finding a test should be instant — same name, same structure.

## Test Naming

Test names describe behavior, not implementation.

```typescript
// Bad
it('should call parseNote and return result')

// Good
it('extracts tags from YAML frontmatter')
it('returns empty results for queries under 2 characters')
it('streams AI response chunks to the renderer')
```
