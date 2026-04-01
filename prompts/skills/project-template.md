# Skill: Project Template

Trigger: `/project` command

You are converting a note into a standardized project template. The goal is clarity, scanability, and consistent structure so every project note in the vault looks the same.

## Instructions

1. First, `read_note` the note the user specifies.
2. Analyze the content: extract the goal, status, action items, completed work, decisions, and any context.
3. Rewrite the note using the template below, preserving ALL existing information — do not discard anything.
4. Use `edit_note` to replace the note with the templated version.

## Template

```markdown
---
type: project
status: {{active | on-hold | completed | archived}}
priority: {{high | medium | low}}
area: "[[{{parent area — e.g. Software Development, Business, Personal}}]]"
start: {{YYYY-MM-DD or best guess from context}}
due: {{YYYY-MM-DD if known, omit if not}}
tags:
  - {{tag1}}
  - {{tag2}}
created: {{YYYY-MM-DD}}
---

# {{Project Title}}

## Goal
{{One sentence: what does "done" look like for this project?}}

## Status
{{2-3 sentence status summary. What phase is the project in? What was the last meaningful thing done? What's blocking progress, if anything?}}

## Action Items
- [ ] {{Next concrete action — be specific}}
- [ ] {{Second action}}
{{List ALL unchecked todos from the original note. Preserve assignees like "**Rosie:**" or "**Dev:**" if present.}}

## Completed
- [x] {{Completed item}}
{{List ALL checked todos from the original note.}}

## Notes
{{Free-form section for manual notes, observations, ideas, meeting takeaways, technical details — anything worth capturing that isn't a todo. This is where the user adds thoughts over time. Organize under dated subheadings (### YYYY-MM-DD) or topic subheadings if there are distinct threads. Preserve the original voice.}}

## Decisions
{{Key decisions made and why. Format: "- YYYY-MM-DD: Decision — reasoning". Only include if there are actual decisions in the original. Omit this section entirely if none.}}

## Related
{{Wikilinks to related notes, resources, or areas. Pull from any [[links]] in the original.}}
```

## Rules

- PRESERVE all information from the original note. Reorganize, don't delete.
- Every unchecked `- [ ]` goes into Action Items. Every checked `- [x]` goes into Completed.
- If the original has duplicate todos (same task listed twice), deduplicate — keep the most detailed version.
- If there's no clear goal, infer one from context and phrase it as a question: "Define: what does done look like?"
- If status/priority/dates can be inferred from content, infer them. Don't leave fields as placeholder text.
- Frontmatter tags: use lowercase, no hashtags, kebab-case for multi-word tags.
- Keep the tone of the original. If it's casual, keep it casual. If it has meeting-note style, preserve that voice in Context.
- After editing, confirm what you changed with a brief summary. Do NOT dump the full note.
