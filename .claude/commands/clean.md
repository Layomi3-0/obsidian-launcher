# Clean Code Refactor Command

Apply clean code principles to the specified target, following the standards in CLAUDE.md.

**Usage:** `/clean <target>`

**Target options:**
- `unstaged` - Refactor all unstaged changes
- `<file-path>` - Refactor entire file (e.g., `app/admin/config/page.tsx`)
- `<file-path>:<function-name>` - Refactor specific function (e.g., `lib/utils.ts:formatDate`)
- `<file-path>:<ComponentName>` - Refactor specific component (e.g., `components/Header.tsx:Header`)

## Instructions

You are a clean code specialist. Your job is to refactor the target code following the Clean Code principles defined in CLAUDE.md.

### Step 1: Identify Target

Based on the argument `$ARGUMENTS`:

1. If `unstaged` → Run `git diff` to get all unstaged changes and identify files to refactor
2. If file path → Read the entire file
3. If `file:function` → Read the file and locate the specific function/component

### Step 2: Read Standards

Read these files to understand the coding standards:
- `CLAUDE.md` - Clean Code Principles section

### Step 3: Analyze Code

For each piece of code, check for violations:

**Naming:**
- [ ] Names reveal intent (why it exists, what it does, how it's used)
- [ ] Classes use nouns, methods use verbs
- [ ] Names are pronounceable and searchable
- [ ] One word per concept (don't mix fetch/retrieve/get)

**Functions:**
- [ ] Functions are small (ideally 2-20 lines)
- [ ] Functions do ONE thing only
- [ ] 0-2 arguments (avoid 3+)
- [ ] No boolean/flag parameters
- [ ] Command-Query Separation (do something OR return something, not both)
- [ ] DRY - no duplicate code

**File Length (CRITICAL — enforce strictly):**
- [ ] **No file exceeds 250 lines.** This is a hard limit, not a suggestion.
- [ ] If a file is over 250 lines, it MUST be split — extract hooks, sub-components, or utilities into separate files.
- [ ] When splitting, co-locate related files in the same directory (e.g., `QuoteCard/index.tsx`, `QuoteCard/useQuoteForm.ts`, `QuoteCard/ShippingPicker.tsx`).
- [ ] Measure lines AFTER refactoring and report per-file line counts in the summary.

**React Components (if applicable):**
- [ ] Single Responsibility - one reason to change
- [ ] Props interface is minimal and focused
- [ ] Complex logic extracted to custom hooks
- [ ] No inline styles (use Tailwind classes)
- [ ] Uses icon library components (not inline SVGs)
- [ ] Uses shared components where applicable

**General:**
- [ ] No over-engineering (only requested changes)
- [ ] No premature abstractions
- [ ] Trust internal code (only validate at boundaries)
- [ ] Delete unused code completely

### Step 4: Refactor

Apply refactoring following established patterns:

**For files approaching or exceeding 250 lines (hard limit):**
1. Extract custom hook for state/logic (`use<Name>.ts`)
2. Split sub-components into their own files
3. Create types file if needed (`types.ts`)
4. Create barrel export (`index.ts`)
5. Co-locate in a directory: `ComponentName/index.tsx`, `ComponentName/SubComponent.tsx`, `ComponentName/useHook.ts`
6. Use existing shared components:
   - Reuse existing components from `src/components/` where applicable

**For functions:**
1. Extract to smaller, single-purpose functions
2. Use descriptive names
3. Reduce arguments (use objects for 3+ params)
4. Remove flag parameters (split into separate functions)

### Step 5: Write Tests

Create comprehensive tests following existing patterns:

```typescript
// Pattern for components
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

describe("ComponentName", () => {
  // Rendering tests
  it("renders correctly with required props", () => {});
  it("renders optional elements when provided", () => {});

  // Interaction tests
  it("calls handler when clicked", () => {});

  // Edge cases
  it("handles empty/null data gracefully", () => {});
  it("displays loading state", () => {});
});
```

```typescript
// Pattern for hooks
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

describe("useHookName", () => {
  it("returns initial state", () => {});
  it("updates state correctly", () => {});
  it("handles async operations", async () => {});
});
```

### Step 6: Verify

1. Run tests: `npm test -- --run`
2. Run type check: `npx tsc --noEmit`
3. Run build: `npm run build`

### Step 7: Report

Provide a summary:
- **Per-file line counts** — list every modified/created file with its line count. Flag any file still over 250 lines as a violation.
- Files modified/created
- Lines before → after (total and per-file)
- Tests added
- Key changes made

## Example Refactoring Patterns

### Extracting a Hook
```typescript
// Before: Component with mixed concerns
function OrderForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  // 200 lines of logic + JSX
}

// After: Separated concerns
function OrderForm() {
  const { step, data, goNext, goBack } = useOrderForm();
  // Clean JSX only
}
```

### Splitting Components
```typescript
// Before: 400-line page component
export default function AdminPage() { /* everything */ }

// After: Composed from focused components
export default function AdminPage() {
  return (
    <>
      <PageHeader />
      <MainContent />
      <Sidebar />
    </>
  );
}
```

### Reusing Existing Code
```typescript
// Before: Duplicated helper
function truncatePath(path: string) { /* ... */ }

// After: Import from shared module
import { truncatePath } from './shared'
```

## Do NOT:
- Add features beyond what's requested
- Create abstractions for one-time operations
- Add error handling for impossible scenarios
- Create documentation files
- Add comments unless logic is non-obvious
- Leave backwards-compatibility hacks
