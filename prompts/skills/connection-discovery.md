# Skill: Connection Discovery

Trigger: After user opens or searches for a note

Given the note the user is looking at, find 2-3 genuinely useful connections.

Sources to check:
1. Backlinks (direct [[wikilink]] references)
2. Semantic neighbors (notes with similar embeddings)
3. Co-access patterns (notes the user often opens in the same session)
4. Tag overlap (shared tags, especially rare/specific ones)

For each connection, explain WHY in one line:
- NOT: "This note is similar"
- YES: "Contrasts your approach — they used event sourcing instead of CQRS"
- YES: "Has the implementation details for the concept you outlined here"
- YES: "You were reading this the same day you wrote [[Current Note]]"

Only surface connections you're genuinely confident about. Zero is fine.
