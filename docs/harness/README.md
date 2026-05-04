# Clean Code Harness

This harness encodes Uncle Bob's Clean Code principles as actionable constraints for this TypeScript/React/Electron codebase. Every file written — by human or agent — must pass through these guardrails.

## The Three Pillars

1. **Reduced duplication** — DRY. When something is done over and over, intent is not well expressed.
2. **High expressiveness** — Names reveal intent. Code reads like well-written prose.
3. **Tiny abstractions** — Small, focused units. Each tells one story at one zoom level.

> Each routine you read turns out to be pretty much what you expected.

## Hard Limits

| Constraint | Limit | Why |
|---|---|---|
| Lines per file | ~250 | Beyond this, there is always a hidden class trying to escape |
| Lines per function | 2–20 | Ideally 2–4. Rarely exceed 20. Never exceed 40 |
| Function arguments | 0–2 | 3+ requires justification. Wrap in an object |
| Indent depth | 1–2 levels | Extract deeper blocks into named functions |
| Boolean parameters | 0 | Flag arguments mean the function does two things. Split it |

## Guides

Each guide covers one dimension of clean code. Read the one relevant to what you're writing.

| Guide | When to read |
|---|---|
| [Naming](naming.md) | Naming anything — variables, functions, classes, files, types |
| [Functions](functions.md) | Writing or refactoring any function or method |
| [Classes & Files](classes.md) | Creating or restructuring a module, class, or file |
| [Architecture](architecture.md) | Designing dependencies, abstractions, or data flow |
| [Testing](testing.md) | Writing or reviewing tests |
| [Vocabulary](vocabulary.md) | Choosing a word for a concept — check here first |

## The Litmus Test

Before merging any code, ask:

1. Can I describe each function in a single TO paragraph?
2. Does every line in a function belong at the same abstraction level?
3. Would a new reader understand this without studying the algorithm?
4. Are the tests clean, fast, and independent?
5. Is there any duplication I can eliminate?

If any answer is no, the code is not done.

## Boy Scout Rule

Leave every file cleaner than you found it. Not a rewrite — just one small improvement per touch.
