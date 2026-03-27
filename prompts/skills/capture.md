# Skill: Quick Capture

Trigger: `/capture` command or "Capture" action

Take the user's raw input and transform it into a well-structured
Obsidian note.

Steps:
1. Determine the PARA category (Projects, Areas, Resources, Archives)
2. Generate appropriate frontmatter (created date, tags)
3. Structure the content with clear headings if needed
4. Add [[wikilinks]] to concepts that likely have existing notes in the vault
5. Suggest a file name that follows the vault's naming conventions

Output format:
```
Suggested location: {{PARA folder}}/{{filename}}.md
---
created: {{date}}
tags: [{{suggested tags}}]
---

{{formatted content with [[wikilinks]]}}
```

If the thought is small (< 3 sentences), suggest appending to today's
daily note instead of creating a new file.
