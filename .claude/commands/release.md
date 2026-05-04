# Release Command

Commit, push, and deploy to production — with branch-aware behavior. On `main`, pushes directly. On a feature branch, creates a PR.

**Usage:** `/release [optional-description]`

## Instructions

### Step 1: Analyze Changes

Run these commands in parallel to understand the current state:

```bash
# Detect current branch
git branch --show-current

# See all changed/untracked files (never use -uall flag)
git status

# See staged and unstaged changes
git diff
git diff --cached

# See recent commits for style consistency
git log --oneline -5
```

### Step 2: Review Changes

1. **Identify what changed** - Group related changes together
2. **Check for secrets** - Never commit files that may contain secrets:
   - `.env`, `.env.*` files
   - `credentials.json`, `secrets.*`
   - Files containing API keys, tokens, passwords
   - If found, warn the user and exclude from commit
3. **Assess scope** - If changes span multiple unrelated concerns, suggest splitting into multiple commits

### Step 3: Run Verification

Before committing, ensure code quality:

```bash
# Run tests
npm test -- --run

# Run build
npm run build
```

**If tests or build fail, STOP.** Fix the issues before committing.

### Step 4: Stage Files

Stage the appropriate files:

```bash
# For all changes (most common)
git add -A

# Or stage specific files if splitting commits
git add <specific-files>
```

### Step 5: Create Commit Message

Follow **Conventional Commits** format:

```
<type>: <short-description>

<optional-body>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat` - New feature or capability
- `fix` - Bug fix
- `refactor` - Code restructuring without behavior change
- `test` - Adding or updating tests
- `docs` - Documentation only
- `chore` - Maintenance, dependencies, tooling
- `style` - Formatting, whitespace (no code change)
- `perf` - Performance improvement

**Guidelines:**
- **Short description**: Imperative mood, lowercase, no period, max 50 chars
- **Body** (optional): Explain the "why" not the "what", wrap at 72 chars
- Focus on the intent and impact, not implementation details

### Step 6: Commit

Use HEREDOC for proper formatting:

```bash
git commit -m "$(cat <<'EOF'
<type>: <short-description>

<optional-body-explaining-why>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### Step 7: Push (Branch-Aware)

Detect the current branch and push accordingly:

**If on `main`:**

```bash
git push origin main
```

If push fails due to remote changes, pull first:

```bash
git pull --rebase origin main && git push origin main
```

**If on a feature branch (any branch other than `main`):**

```bash
# Push with upstream tracking
git push -u origin <branch-name>

# Create a pull request
gh pr create --title "<short PR title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points describing the changes>

## Test plan
- [ ] Tests pass (`npm test -- --run`)
- [ ] Build succeeds (`npm run build`)
<additional verification steps as needed>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**PR title guidelines:**
- Under 70 characters
- Descriptive of the overall change, not implementation details
- Use the commit message subject as a starting point

### Step 8: Deploy

Deploy backend first, then frontend:

```bash
# Deploy Convex functions
npx convex deploy

# Deploy frontend to Vercel production
vercel --prod
```

Wait for both deployments to complete.

### Step 9: Report

Report the final state:
- Commit hash (from `git log -1 --oneline`)
- **If feature branch:** PR URL
- **If main:** Push confirmation
- Vercel production URL
- Convex deployment status

## Safety Rules

**NEVER:**
- Commit with failing tests
- Commit with build errors
- Commit secrets or credentials
- Use `git commit --amend` on pushed commits
- Use `--force` push without explicit user request
- Use `-i` interactive flags
- Skip hooks with `--no-verify` unless explicitly requested

**ALWAYS:**
- Run tests before committing
- Run build before committing
- Include the Co-Authored-By line
- Use HEREDOC for multi-line messages
- Keep commits atomic and focused
- Deploy Convex before Vercel (backend before frontend)

## Handling Edge Cases

### No changes to commit
```
No changes detected. Nothing to release.
```

### Mixed unrelated changes
Suggest splitting:
```
I see changes to both the order form and the admin dashboard.
These seem unrelated. Would you like me to:
1. Release everything together
2. Split into separate commits (recommended)
```

### Secrets detected
```
Warning: Found potential secrets in staged files:
- .env.local (contains API keys)

I cannot commit these files. Please:
1. Add them to .gitignore
2. Remove from staging with: git reset .env.local
```

### Tests failing
```
Tests are failing. Please fix before releasing:
[test output]

Would you like me to investigate the failures?
```

### Push rejected (main only)
```
Push was rejected. Remote has newer commits.
Pulling with rebase and retrying...
```

### PR already exists (feature branch)
If `gh pr create` fails because a PR already exists, update it instead:
```bash
git push origin <branch-name>
```
Then report the existing PR URL:
```bash
gh pr view --web
```

### Vercel deployment failed
```
Vercel deployment failed:
[error output]

The commit and push succeeded. You can retry deployment with:
vercel --prod
```

### Convex deployment failed
```
Convex deployment failed:
[error output]

The commit and push succeeded. Fix the issue and retry with:
npx convex deploy
```

## Arguments

If the user provides `$ARGUMENTS`, use it as guidance for the commit message focus. For example:

- `/release` - Analyze changes and generate appropriate message
- `/release fix login redirect` - Focus message on the login redirect fix
- `/release refactor auth` - Frame as a refactoring of auth system
