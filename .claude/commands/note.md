# Note Command

Add a learning note or summary to a note file in the Obsidian vault.

**Usage:** `/note <note-path-or-topic> -- <content>`

## Instructions

### Step 1: Determine the Note File

Based on `$ARGUMENTS`:

1. If a file path is provided, use it directly (relative to the vault root)
2. If only a topic is provided, search the vault for a relevant existing note
3. The vault path is configured via `VAULT_PATH` env var or `~/.brain-dump/config.toml`

### Step 2: Read Current Notes

Read the target note file to understand its existing structure and content.

### Step 3: Understand the Topic

Based on `$ARGUMENTS`, determine:
1. **Topic** - What concept is being documented
2. **Context** - Any relevant context from the current conversation
3. **Section** - Where it fits in the existing structure (Terms, new section, etc.)

### Step 4: Format the Note

Structure the note clearly:
- Use a descriptive heading (## or ###)
- Keep explanations concise but complete
- Use tables for comparisons
- Use code blocks for examples
- Link related concepts if applicable

### Step 5: Add to File

Append or insert the note in the appropriate section of the target note file.

If the topic fits under an existing section (like Terms), add it there.
If it's a new category, create a new section.

### Step 6: Confirm

Tell the user what was added and where.

## Examples

### Simple term
```
/note webhook - an HTTP endpoint that receives callbacks from external services
```

Adds a brief definition to the Terms section.

### Detailed concept from conversation
```
/note summarize our discussion about authentication flows
```

Creates a structured summary of the conversation's key points about authentication.

### New topic
```
/note exchange rates - how we fetch and cache USD/NGN rates
```

Adds explanation about exchange rate handling.

## Guidelines

- Keep notes scannable (headers, bullets, tables)
- Focus on the "why" not just the "what"
- Include practical examples when relevant
- Link to related concepts in the codebase when helpful
- Use Obsidian-compatible markdown (wikilinks okay)
