# Ship Command

Commit, push to main, and deploy to Vercel production in one step.

**Usage:** `/ship [optional-description]`

## Instructions

### Step 1: Analyze Changes

Run these commands in parallel to understand the current state:

```bash
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

### Step 7: Push to Main

```bash
git push origin main
```

If push fails due to remote changes, pull first:

```bash
git pull --rebase origin main && git push origin main
```

### Step 8: Deploy to Vercel

Deploy to Vercel production and also push the Convex functions:

```bash
# Deploy Convex functions
npx convex deploy

# Deploy frontend to Vercel production
vercel --prod
```

Wait for both deployments to complete and report the production URL.

### Step 9: Verify

```bash
# Confirm commit
git log -1

# Confirm push
git status
```

Report the final state:
- Commit hash
- Production URL from Vercel
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
No changes detected. Nothing to ship.
```

### Mixed unrelated changes
Suggest splitting:
```
I see changes to both the order form and the admin dashboard.
These seem unrelated. Would you like me to:
1. Ship everything together
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
Tests are failing. Please fix before shipping:
[test output]

Would you like me to investigate the failures?
```

### Push rejected
```
Push was rejected. Remote has newer commits.
Pulling with rebase and retrying...
```

### Vercel deployment failed
```
Vercel deployment failed:
[error output]

The commit and push succeeded. You can retry deployment with:
vercel --prod
```

## Arguments

If the user provides `$ARGUMENTS`, use it as guidance for the commit message focus. For example:

- `/ship` - Analyze changes and generate appropriate message
- `/ship fix login redirect` - Focus message on the login redirect fix
- `/ship refactor auth` - Frame as a refactoring of auth system
