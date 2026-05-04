# Build Feature Command (TDD)

Build a feature using Test-Driven Development. For each milestone, write a failing test first, then implement until it passes.

**Usage:** `/build-feature <feature-description>`

## CRITICAL: Test-First Development

**For every major milestone of the feature, you MUST:**

1. **Write a failing test** that defines what success looks like
2. **Run the test** to confirm it fails (RED)
3. **Implement the minimal code** to make the test pass (GREEN)
4. **Refactor if needed** while keeping tests green
5. **Move to the next milestone** and repeat

This is non-negotiable. Code without tests is not clean.

## Instructions

### Step 1: Understand the Feature

Based on the argument `$ARGUMENTS`:

1. Identify what the feature should do
2. Search for related code using `/explore-first` patterns
3. Read existing implementations for context
4. Understand the existing test infrastructure

### Step 2: Break Down into Milestones

Create a TodoWrite task list breaking the feature into testable milestones.

Each milestone should be:
- **Small** - Achievable in one TDD cycle
- **Testable** - Has clear pass/fail criteria
- **Independent** - Can be verified in isolation
- **Incremental** - Builds on previous milestones

Example breakdown:
```
Feature: Add user preferences to settings

Milestones:
1. Create preferences schema/types
2. Add preferences query function
3. Add preferences mutation function
4. Create PreferencesForm component (renders correctly)
5. Add form validation
6. Add form submission handling
7. Add success/error feedback
```

### Step 3: TDD Cycle for Each Milestone

For **EVERY** milestone, follow this exact cycle:

#### 3a. Write the Failing Test (RED)

Before writing ANY implementation code:

```typescript
// Example: Testing a new query function
describe("getPreferences", () => {
  it("should return user preferences by userId", async () => {
    const preferences = await getPreferences({ userId: "user_123" });
    expect(preferences).toEqual({
      theme: "light",
      notifications: true,
    });
  });
});
```

```typescript
// Example: Testing a new component
describe("PreferencesForm", () => {
  it("should render theme selector", () => {
    render(<PreferencesForm userId="user_123" />);
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
  });
});
```

#### 3b. Run the Test - Confirm It Fails

```bash
npm test -- --run --reporter=verbose <test-file>
```

**The test MUST fail.** If it passes:
- You're testing something that already exists
- Your test isn't specific enough
- Revise before proceeding

#### 3c. Implement Minimal Code (GREEN)

Write ONLY enough code to make the test pass:
- No extra features
- No "while I'm here" improvements
- No premature abstractions
- Just enough to turn RED to GREEN

#### 3d. Run the Test - Confirm It Passes

```bash
npm test -- --run --reporter=verbose <test-file>
```

#### 3e. Refactor (Optional)

If the code can be cleaner:
- Improve naming
- Extract small functions
- Remove duplication
- Keep tests passing throughout

#### 3f. Run Full Suite

Before moving to the next milestone:
```bash
npm test -- --run
```

#### 3g. Mark Milestone Complete

Update TodoWrite to mark the milestone complete, then proceed to the next.

### Step 4: Repeat Until Feature Complete

Continue the TDD cycle for each milestone until the entire feature is implemented.

### Step 5: Final Verification

```bash
npm test -- --run          # All tests pass
npm run build              # Build succeeds
npm run typecheck           # No type errors
```

### Step 6: Commit

Create atomic commits as you complete milestones. Each commit should include its test.

```bash
git add -A && git commit -m "feat(<scope>): <milestone-description>

<what-was-added-and-why>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

## Test Patterns by Feature Type

### Data Layer (Queries/Mutations)

```typescript
describe("createPreferences", () => {
  it("should create preferences with defaults", async () => {
    const result = await createPreferences({ userId: "user_123" });
    expect(result.theme).toBe("light");
    expect(result.notifications).toBe(true);
  });

  it("should reject invalid userId", async () => {
    await expect(createPreferences({ userId: "" }))
      .rejects.toThrow("userId is required");
  });
});
```

### Components (Rendering)

```typescript
describe("PreferencesForm", () => {
  it("should render all preference fields", () => {
    render(<PreferencesForm preferences={mockPreferences} />);
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });

  it("should display current values", () => {
    render(<PreferencesForm preferences={{ theme: "dark" }} />);
    expect(screen.getByDisplayValue("dark")).toBeInTheDocument();
  });
});
```

### Components (Interactions)

```typescript
describe("PreferencesForm", () => {
  it("should call onSave with updated values", async () => {
    const onSave = vi.fn();
    render(<PreferencesForm onSave={onSave} />);

    await userEvent.selectOptions(screen.getByLabelText("Theme"), "dark");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ theme: "dark" });
  });
});
```

### Hooks

```typescript
describe("usePreferences", () => {
  it("should return loading state initially", () => {
    const { result } = renderHook(() => usePreferences("user_123"));
    expect(result.current.isLoading).toBe(true);
  });

  it("should return preferences after loading", async () => {
    const { result } = renderHook(() => usePreferences("user_123"));
    await waitFor(() => {
      expect(result.current.preferences).toEqual(mockPreferences);
    });
  });
});
```

### Validation

```typescript
describe("preferencesSchema", () => {
  it("should accept valid preferences", () => {
    const result = preferencesSchema.safeParse({
      theme: "dark",
      notifications: true,
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid theme", () => {
    const result = preferencesSchema.safeParse({
      theme: "invalid",
    });
    expect(result.success).toBe(false);
  });
});
```

## Example Feature Workflow

User: `/build-feature add dark mode toggle to settings`

Claude should:

1. **Explore** existing settings code and test patterns
2. **Break down** into milestones:
   - Schema for theme preference
   - Query to get current theme
   - Mutation to update theme
   - ThemeToggle component renders
   - Toggle changes theme
   - Theme persists on reload

3. **Milestone 1: Schema**
   - Write test: `it("should validate theme values")`
   - Run test → FAIL
   - Create schema with theme field
   - Run test → PASS
   - Commit: "feat(preferences): add theme preference schema"

4. **Milestone 2: Query**
   - Write test: `it("should return theme preference")`
   - Run test → FAIL
   - Implement query function
   - Run test → PASS
   - Commit: "feat(preferences): add getTheme query"

5. **Continue** for each milestone...

## Anti-Patterns - DO NOT

- Write implementation code before tests
- Write multiple features then add tests after
- Skip the "confirm test fails" step
- Write tests that pass immediately
- Add features beyond the current milestone
- Refactor while tests are failing
- Commit code without its corresponding test

## Clean Code Reminders

From CLAUDE.md:
- **Code without tests is not clean**
- **Functions should be small** (2-20 lines)
- **Do ONE thing** per function
- **0-2 arguments** per function
- **DRY** - no duplicate code
- **Three similar lines are better than a premature abstraction**

## Integration with Other Commands

- Use `/explore-first <feature>` before starting to understand existing code
- Use `/create-plan <feature>` for large features spanning multiple sessions
- Use `/clean unstaged` after completing milestones to polish code
