# Create Plan Command

Create a structured plan for a new feature, refactor, or migration. Use this command when you need to break down a complex task into milestones that can be executed across multiple sessions.

## When to Use This Command

- Large features requiring multiple days of work
- Codebase refactors or migrations
- Infrastructure changes with multiple dependencies
- Any task that benefits from checkpoint-based progress tracking

## Directory Structure

Create under `docs/plans/active/{plan-name}/`:

```
docs/plans/active/{plan-name}/
├── README.md              # Plan overview with status and quick links
├── decisions/             # Architecture Decision Records (empty initially)
└── milestones/
    ├── 00-{first-milestone}.md
    ├── 01-{second-milestone}.md
    ├── 02-{third-milestone}.md
    └── ...
```

## Step 1: Create README.md

Use this template for `docs/plans/active/{plan-name}/README.md`:

```markdown
# {Plan Title}

{One-line description of what this plan accomplishes}

## Status

| Field | Value |
|-------|-------|
| **Status** | Not Started |
| **Current Milestone** | M0: {First Milestone Name} |
| **Created** | {YYYY-MM-DD} |
| **Last Updated** | {YYYY-MM-DD} |

## Quick Links

- [Milestone 0: {Name}](./milestones/00-{slug}.md) ← **Start Here**
- [Milestone 1: {Name}](./milestones/01-{slug}.md)
- [Milestone 2: {Name}](./milestones/02-{slug}.md)
{Continue for all milestones}

## Overview

### Why {Plan Name}?

| Problem | Impact |
|---------|--------|
| {Current problem 1} | {Why it matters} |
| {Current problem 2} | {Why it matters} |
| {Current problem 3} | {Why it matters} |

### Current State

{Describe what exists now, with specific files/metrics if applicable}

| File/Area | Current | Target |
|-----------|---------|--------|
| {file.ts} | {current state} | {target state} |

### Target State

{Describe the end goal in clear, measurable terms}

- {Specific outcome 1}
- {Specific outcome 2}
- {Specific outcome 3}

## Milestones Summary

| # | Milestone | Status | Complexity | Deliverables |
|---|-----------|--------|------------|--------------|
| 0 | {Name} | Not Started | Low/Medium/High | {Key output} |
| 1 | {Name} | Not Started | Low/Medium/High | {Key output} |
| 2 | {Name} | Not Started | Low/Medium/High | {Key output} |

## Strategy

**{Strategy Name}**

1. {Step 1 of overall approach}
2. {Step 2 of overall approach}
3. {Step 3 of overall approach}

## Guidelines Reference

{Link to any relevant documentation or coding standards}

## Decisions

Architecture decisions documented in [decisions/](./decisions/).

| Decision | Status | Rationale |
|----------|--------|-----------|
| {Decision 1} | Decided/Pending | {Brief reason} |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| {Risk 1} | {How to prevent or handle} |
| {Risk 2} | {How to prevent or handle} |

## Success Criteria

- [ ] {Measurable criterion 1}
- [ ] {Measurable criterion 2}
- [ ] {Measurable criterion 3}
```

## Step 2: Create Milestone Files

Create each milestone in `docs/plans/active/{plan-name}/milestones/`:

Use this template for each `{NN}-{milestone-slug}.md`:

```markdown
# Milestone {N}: {Milestone Name}

**Status:** Not Started
**Complexity:** Low | Medium | High
**Prerequisites:** {List milestone dependencies, e.g., "Milestones 0-2" or "None"}

## Goal

{One paragraph describing what this milestone achieves and why it matters}

## Tasks

### {N}.1 {Task Group Name}

- [ ] {Specific, actionable task}
- [ ] {Another specific task}
- [ ] {Include file paths where relevant}

{Include code examples for complex implementations:}

```typescript
// path/to/file.ts
{Code showing the pattern or implementation}
```

### {N}.2 {Next Task Group}

- [ ] {Continue with more tasks}
- [ ] {Use checkboxes for every actionable item}

```bash
# Include shell commands where helpful
npm install {package}
```

### {N}.3 {Write Tests} (if applicable)

- [ ] Create test file at `path/to/__tests__/file.test.ts`

```typescript
// Example test structure
describe('{Component/Module}', () => {
  it('{expected behavior}', () => {
    // Test implementation
  });
});
```

## Verification Checklist

- [ ] {How to verify task 1 is complete}
- [ ] {How to verify task 2 is complete}
- [ ] {Commands to run: `npm test`, `npm run build`, etc.}
- [ ] {Manual checks if needed}

## Files Created

```
{List of new files with their paths}
path/to/new-file.ts
path/to/another-file.ts
```

## Files Modified

```
{List of modified files}
path/to/existing-file.ts (description of changes)
```

## Files Deleted

```
{List of deleted files, or "None" if no deletions}
```

## Next Milestone

[Milestone {N+1}: {Name} →](./0{N+1}-{slug}.md)
```

## Step 3: Update Plans Index

After creating the plan, update `docs/plans/README.md`:

1. Add to the "Active Plans" table:

```markdown
| [Plan Name](./active/{plan-name}/) | Not Started | M0: {First Milestone} | {Brief description} |
```

2. If replacing an existing plan, move the old one to `completed/`

## Step 4: Create Empty Decisions Directory

```bash
mkdir -p docs/plans/active/{plan-name}/decisions
```

## Guidelines for Good Plans

### Milestone Sizing
- Each milestone should be completable in 1-3 focused sessions
- If a milestone has more than 10 task groups, split it
- Complex milestones (High complexity) should have fewer tasks

### Task Specificity
- Every task should be actionable (start with a verb)
- Include specific file paths, not vague descriptions
- Add code examples for any non-trivial implementation

### Dependencies
- Clearly state prerequisites for each milestone
- Design milestones to minimize blocking dependencies
- Infrastructure/setup milestones should come first

### Verification
- Include runnable commands (`npm test`, `npm run build`)
- Add manual verification steps where automated checks aren't possible
- Make success criteria measurable

### Code Examples
- Include enough code to show the pattern clearly
- Use TypeScript types to clarify interfaces
- Show file paths in comments

## Example Plan Names

- `component-refactor` - Refactoring React components
- `convex-migration` - Database migration to Convex
- `auth-upgrade` - Authentication system upgrade
- `api-v2` - New API version implementation
- `performance-optimization` - Performance improvements

## Post-Creation Checklist

After creating the plan:

- [ ] All milestone files exist and link to each other
- [ ] README.md Quick Links all work
- [ ] `docs/plans/README.md` updated with new plan
- [ ] Empty `decisions/` directory created
- [ ] First milestone marked with "← **Start Here**"
