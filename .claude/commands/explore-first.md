# Explore First Command

Before implementing any feature or continuing work on a plan, first explore the codebase thoroughly using a sub-agent to understand the full context.

**Usage:** `/explore-first <feature-or-task-description>`

## CRITICAL: You MUST Use a Sub-Agent

**DO NOT** try to explore by yourself with direct Glob/Grep/Read calls.

**YOU MUST** immediately call the Task tool with these exact parameters:

```
Tool: Task
subagent_type: "Explore"
prompt: <the exploration prompt below>
```

This is non-negotiable. The exploration MUST be done by a dedicated sub-agent.

## Why Sub-Agent Exploration

- Sub-agents can do deep, thorough exploration without consuming your main context
- They return a comprehensive summary you can act on
- They follow multiple threads of investigation in parallel
- Direct exploration by you leads to shallow understanding and context bloat

## Execute This Immediately

When this command is invoked, your FIRST action must be to call the Task tool:

```json
{
  "tool": "Task",
  "subagent_type": "Explore",
  "prompt": "Explore the codebase before implementing: $ARGUMENTS\n\nThoroughly investigate:\n\n1. **Related Code**: Find ALL files, components, hooks, and utilities related to this feature. Read them fully.\n\n2. **Existing Patterns**: What architectural patterns, conventions, and coding standards are established? Look at similar features for reference.\n\n3. **Infrastructure Available**: What shared components, utilities, constants, validators, hooks, and helpers already exist that should be used? Check:\n   - components/shared/\n   - components/ui/\n   - components/icons/\n   - lib/constants/\n   - lib/validators/\n   - lib/utils/\n   - Any relevant hooks\n\n4. **Dependencies**: What does this feature depend on? What other code depends on it?\n\n5. **Tests**: What testing patterns are established? What test utilities exist in test/?\n\n6. **Documentation**: Check docs/ for any plans, READMEs, or documentation explaining how this area works.\n\n7. **Current State**: If this is continuing existing work, what has already been completed?\n\nBe VERY thorough - read all relevant files completely. Provide a comprehensive report of:\n- What infrastructure is already in place\n- What patterns have been established  \n- What can be built upon vs what needs to be created\n- Specific files and line numbers for key code"
}
```

## After Sub-Agent Returns

Once the Explore sub-agent returns its findings:

1. **Summarize** the key discoveries for the user
2. **Create a TodoWrite** task list based on the findings
3. **Then and only then** proceed with implementation

## Anti-Patterns

❌ Skipping the sub-agent and exploring directly
❌ Using a shallow/quick exploration
❌ Starting implementation before exploration completes
❌ Ignoring the sub-agent's findings

## Example Usage

User: `/explore-first add dark mode toggle to settings`

Claude should:
1. Launch explore agent to find: existing theme code, settings components, CSS variable usage, design tokens, any existing dark mode work
2. Wait for results
3. Summarize: "Found ThemeProvider in components/Providers.tsx, CSS variables in globals.css, Settings page at app/settings/page.tsx"
4. Create todo list based on findings
5. Begin implementation using discovered patterns

## When to Use This Command

- Starting work on a new feature
- Continuing a multi-milestone plan
- Picking up work from a previous session
- Any time you're unsure what infrastructure exists

## Anti-Patterns to Avoid

❌ Starting to write code immediately
❌ Assuming you know the codebase structure
❌ Creating new utilities that already exist
❌ Ignoring established patterns
❌ Skipping test infrastructure discovery

## Integration with /create-plan

If exploring reveals this is a large feature requiring multiple milestones:
1. Complete exploration first
2. Then use `/create-plan` to structure the work
3. The exploration results inform better milestone design
