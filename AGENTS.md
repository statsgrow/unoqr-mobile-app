# AGENTS.md

This file defines the coding style conventions for AI agents working in this repository.

## Coding Style

- Use TypeScript with explicit prop and helper types.
- Use Lucide icons with `strokeWidth={1.25}` consistently for UI icons. Preserve official brand assets for brand logos.
- Keep imports grouped in this order:
  1. React/external libraries
  2. Internal alias imports (`@/...`)
  3. Relative/local imports
- Organize every `.tsx` file in this order:
  1. Imports
  2. Types
  3. Main exported function/component
  4. Helper functions
  5. Styles
- Add a one-line comment immediately above every main function/component and helper function describing what it does.
- Use section dividers to keep files readable:
  - `/* ------------------ BREAK ------------------ */`
- Keep helper functions near their usage (usually below component body and above styles).
- Keep styles in `StyleSheet.create(...)` at file bottom.
- Prefer theme tokens over hardcoded values:
  - `colors`, `spacing`, `radii`, `fontFamilies`, `fontSizes`, and related tokens from `src/theme/tokens.ts`.
  - If legacy components still depend on `src/theme/themeSettings.ts`, treat it as a compatibility layer rather than the primary source.
- Keep route components as default exports.
- Keep page-specific code inside that page file by default.
  - Root-level JSX, page helpers, and local page logic should stay in the page unless explicitly asked to move them into `components`, `utils`, `assets`, or other shared folders.
- Keep feature-specific custom components inside that feature's helper directory.
  - Scan components must live in `src/helpers/scans/components/`, not `src/components/`.
- New page routes should live directly in their route path when possible.
  - Prefer files like `/auth/login.tsx` over `/auth/login/index.tsx` unless explicitly told to use folder-based route files.
- Common style pattern in components:
  - `//Default Return` comment before return block.
- Closing comment convention is required:
  - Exported functions/exports should end with comments like `};//export ends`.
  - Non-export functions should end with comments like `};//func ends`.
  - Return blocks should end with comments like `);//return ends` when applicable.
  - `if` blocks should end with comments like `};//if ends` when applicable.

## Implementation Simplicity

- Prefer the smallest implementation that satisfies the requested flow.
- Follow an existing working project pattern when the user points to one; do not add speculative validation, fallback mechanisms, abstractions, or alternate flows unless they are required by the stated contract or a concrete security boundary.
- Before adding logic to fix an integration failure, verify that the app and API deployments are running compatible versions.
- Keep necessary validation focused at the actual trust boundary and avoid duplicating the same check across layers without a demonstrated need.

## Validation

- Run `npm run typecheck` after non-trivial changes.
