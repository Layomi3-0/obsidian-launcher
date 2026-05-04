# Vocabulary

One word per concept. This is the project's glossary. Check here before naming anything.

When you need a word for a concept already listed, **use the word listed here.** Do not introduce synonyms.

## Data Access

| Concept | Word | NOT |
|---|---|---|
| Retrieve one thing | `get` | fetch, retrieve, find, load, read, obtain |
| Retrieve a list | `list` | getAll, fetchAll, findAll |
| Search with a query | `search` | query, find, lookup, filter |
| Write to storage | `save` | store, persist, write, put |
| Remove from storage | `remove` | delete, destroy, drop, erase |
| Check existence | `has` | exists, contains, includes |

## Transformation

| Concept | Word | NOT |
|---|---|---|
| Convert format | `parse` | transform, convert, decode, deserialize |
| Build from parts | `build` | create, construct, make, compose, assemble |
| Produce output format | `render` | format, display, show, print |
| Combine multiple inputs | `merge` | combine, join, concat, aggregate |
| Add to a collection | `append` | add, insert, push (unless it's a stack) |

## Lifecycle

| Concept | Word | NOT |
|---|---|---|
| Start a process | `start` | begin, init, launch, boot, run |
| Stop a process | `stop` | end, terminate, kill, halt, shutdown |
| Set up before work | `initialize` | setup, configure, bootstrap, prepare |
| Tear down after work | `dispose` | cleanup, teardown, destroy, close |
| Refresh stale data | `reindex` | refresh, reload, sync, update |

## State

| Concept | Word | NOT |
|---|---|---|
| Boolean check | `is` / `has` / `should` | check, verify, validate (for simple booleans) |
| Validate correctness | `validate` | check, verify, ensure, assert |
| Active/enabled | `active` | enabled, on, live, running |
| Visible/shown | `visible` | shown, displayed, open |

## AI / Prompt

| Concept | Word | NOT |
|---|---|---|
| Send to AI and get response | `stream` | generate, complete, ask, prompt, chat |
| Build the system prompt | `assemblePrompt` | buildPrompt, createPrompt, composePrompt |
| Choose which skill to use | `selectSkill` | detectSkill, matchSkill, routeSkill |
| The AI's response text | `response` | answer, reply, completion, output |

## Events / IPC

| Concept | Word | NOT |
|---|---|---|
| Send from main to renderer | `send` | emit, push, broadcast, dispatch |
| Renderer requests main | `invoke` | call, request, ask |
| Handle an incoming request | `handle` | process, receive, on |
| React to a state change | `on` + event name | listen, subscribe, watch |

---

**When adding a new concept:** Add it here first, then use it in code. If two words seem equally good, pick the shorter one.
