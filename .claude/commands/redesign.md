# Redesign Command

Explore alternative, innovative UI designs for a component, generating 5 distinct design concepts.

**Usage:** `/redesign <component-name>`

## CRITICAL: Use the Frontend Design Skill

**YOU MUST** use the `frontend-design:frontend-design` skill for each design variant. This ensures production-grade, distinctive interfaces that avoid generic AI aesthetics.

## Instructions

### Step 1: Understand the Target Component

Based on the argument `$ARGUMENTS`:

1. Identify the component to redesign
2. Read the current implementation thoroughly (all components, styles, data flow)
3. Read `CLAUDE.md` for project conventions
4. Understand what data the component works with and what user actions it supports

### Step 2: Analyze the Current Design

Before creating alternatives, understand what exists:

- What is the component's primary purpose?
- What data does it display?
- What user interactions does it support?
- What are the current pain points or areas for improvement?
- What works well that should be preserved?

### Step 3: Create the Design Exploration Components

Create 5 design variant components under `src/components/design-lab/`. These are temporary exploration components:

```
src/components/design-lab/Design1.tsx
src/components/design-lab/Design2.tsx
src/components/design-lab/Design3.tsx
src/components/design-lab/Design4.tsx
src/components/design-lab/Design5.tsx
```

### Step 4: Generate 5 Distinct Designs

For each design, invoke the `frontend-design:frontend-design` skill. Each design MUST be:

- **Creative and unique** from all other variants and from the existing design
- **Fully functional** — not a mockup, but real interactive React/Tailwind code
- **On-brand** — uses the project's existing design tokens and Tailwind config
- **User-focused** — enhances clarity, simplicity, and usability

#### Design Direction Guidelines

Push the limits of your design capabilities. Each design should explore a fundamentally different approach:

**Design 1 — Bold & Immersive**: Full-bleed hero sections, dramatic typography scale, cinematic transitions, rich visual hierarchy with layered depth effects.

**Design 2 — Minimal & Refined**: Maximized whitespace, subtle micro-interactions, elegant typography, information density through clever progressive disclosure.

**Design 3 — Data-Forward & Functional**: Information-dense dashboard-style layout, clear data visualization, scannable metrics, power-user efficiency.

**Design 4 — Warm & Conversational**: Friendly, approachable tone, card-based conversational layout, progress storytelling, emotional design touches.

**Design 5 — Magazine & Editorial**: Editorial-quality layout with asymmetric grids, feature imagery areas, pull-quotes, typographic rhythm, premium print-inspired feel.

#### Required Elements for Each Design

Each design must:
- Use the project's existing Tailwind config and CSS variables
- Import and use existing components from `src/components/` where applicable
- Include realistic placeholder data that reflects the component's actual data shape
- Include hover states, transitions, and micro-animations
- Have a self-contained component (no modifications to existing components)

### Step 5: Create an Index Component

Create a design lab index component at `src/components/design-lab/DesignLabIndex.tsx` that renders all 5 designs with:
- Preview description of each design direction
- Toggle buttons to switch between Design1 through Design5
- The name of the component being redesigned

### Step 6: Verify

```bash
npm run build    # Ensure all designs compile
```

### Step 7: Present Results

Report to the user:
- The component being redesigned
- A brief description of each design's approach
- How to render each design variant for comparison

## Design Principles

When generating designs, focus on elements that enhance the user experience:

- **Clarity** — Information hierarchy should be immediately scannable
- **Trust** — Design should communicate reliability and professionalism
- **Simplicity** — Remove friction, reduce cognitive load
- **Transparency** — Make status and next steps crystal clear
- **Delight** — Add moments of surprise through animation, color, and interaction

## Technical Constraints

- Use React functional components with TypeScript
- Use Tailwind CSS classes consistent with the project's existing styles
- Use existing shared components from `src/components/`
- Do NOT use `<style jsx>` tags — use only Tailwind classes
- Do NOT modify any existing components
- Do NOT add new dependencies
- Use realistic mock data that matches the component's actual data shape
- Each design component should be self-contained (sub-components can be defined in the same file or co-located in the `design-lab/` directory)

## Cleanup

After the user has chosen a design direction:
- The chosen design can be adapted into the actual component
- The `src/components/design-lab/` directory can be deleted
- Run `/clean` on the final implementation

## Example

User: `/redesign AIResponse`

Claude should:
1. Read the target component and all related files in `src/components/`
2. Read the project's Tailwind config and styles
3. Create 5 distinct design variants using the frontend-design skill
4. Build each as a standalone component under `src/components/design-lab/`
5. Create the index component
6. Verify the build passes
7. Present the 5 designs for the user to compare
