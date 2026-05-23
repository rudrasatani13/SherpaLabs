# Coding Standards

This document captures the conventions every Sherpa Labs workspace follows.
It complements — does not replace — what is mechanically enforced by ESLint,
Prettier, and `tsc --strict`. If a rule here conflicts with what the
linter accepts, the linter wins; open a PR to update either side.

For the contribution workflow (branches, commits, reviews), see
[`CONTRIBUTING.md`](./CONTRIBUTING.md). For the why-it-was-chosen
rationale, see [`DECISIONS/`](./DECISIONS/).

## TypeScript

- **Strict mode is non-negotiable.** Every `tsconfig.json` in the repo
  extends `@sherpa-labs/shared-config/tsconfig.base.json`, which sets
  `strict: true`, `noUncheckedIndexedAccess: true`, and friends.
- **No `any`.** If you genuinely need an escape hatch, use `unknown` and
  narrow it. The only place `any` is acceptable is inside a `// @ts-expect-error`
  comment block that includes a reason.
- **Prefer `type` aliases for unions and shapes; use `interface` only when
  declaration-merging is intentional** (rare in this codebase, common
  when augmenting library types).
- **Exports are explicit.** Every package's public surface lives in
  `src/index.ts`. Do not import from a package's internal paths from
  another package — only its entry point.
- **No default exports** for library code. Default exports break
  refactors and confuse re-exports. Named exports only.
  Exceptions: framework conventions that require defaults (Next.js
  `page.tsx`, `layout.tsx`, route handlers; build-config files).
- **Path aliases:** if a package needs internal `@/` aliases, configure
  them in that package's `tsconfig.json` only. Do not introduce
  cross-package aliases — `workspace:*` and project references handle
  that.

## File and directory naming

| What                      | Convention                             | Example                                 |
| ------------------------- | -------------------------------------- | --------------------------------------- |
| Workspace package name    | `@sherpa-labs/<kebab-case>`            | `@sherpa-labs/core-rules`               |
| Source files (general)    | `kebab-case.ts`                        | `audit-result.ts`, `parse-claude-md.ts` |
| React components (`.tsx`) | `PascalCase.tsx`                       | `AuditScoreCard.tsx`                    |
| Next.js route segments    | Framework defaults (`page.tsx`, etc.)  | `app/audits/[id]/page.tsx`              |
| Test files                | `<unit>.test.ts` next to the unit      | `parse-claude-md.test.ts`               |
| Type-only modules         | `kebab-case.ts` under `src/types/`     | `src/types/rule-set.ts`                 |
| Constants / enums         | `kebab-case.ts` under `src/constants/` | `src/constants/severity.ts`             |
| ADR files                 | `NNN-<kebab-slug>.md`                  | `001-monorepo-with-pnpm.md`             |

Directory names are always `kebab-case`. Avoid single-letter directory
names (`utils/u.ts` is not allowed; spell it out).

## Identifier naming

- **Variables, functions, methods:** `camelCase`.
- **Types, classes, React components, type parameters:** `PascalCase`.
- **Constants (true global immutables, e.g. lookup tables):** `SCREAMING_SNAKE_CASE`.
  Local `const` declarations stay `camelCase`.
- **Booleans:** prefix with a verb — `isFoo`, `hasFoo`, `shouldFoo`,
  `canFoo`. Never bare nouns (`error: boolean` → `hasError: boolean`).
- **Async functions:** name the action, not the asynchrony. `loadAudit()`,
  not `getAuditAsync()`.
- **Acronyms in identifiers:** treat as words. `parseMcpManifest`, not
  `parseMCPManifest`; `HttpError`, not `HTTPError`.

## Package layout

Every published package follows the same skeleton:

```
packages/<name>/
├── src/
│   ├── index.ts            # Public surface — everything re-exported here
│   ├── <feature>/          # Grouped by domain feature, not by file kind
│   │   ├── index.ts
│   │   └── <feature>.ts
│   └── types/              # Local types (cross-package types go in shared-types)
├── tests/                  # If unit tests aren't colocated, they live here
├── package.json
├── tsconfig.json
└── README.md               # What the package does + minimal usage example
```

- **Group by feature, not by kind.** Do not create top-level `services/`,
  `helpers/`, `utils/` buckets. A `parse-claude-md/` directory that owns
  its own helpers is easier to navigate than ten thin layers.
- **`utils/` is a smell.** If a helper has no clear owner, it usually
  belongs in the feature that consumes it. Genuine cross-package
  utilities go in `packages/shared-types` (types) or a future
  `packages/core-utils` (runtime helpers — explicitly scoped in Phase 9).
- **`index.ts` is a re-export file.** Do not put logic in it. Anyone
  reading `index.ts` should immediately see the package's surface area.

## Module boundaries

- Inside a package, prefer deep imports for **internal** code (`./parse/lex`)
  and the package root (`@sherpa-labs/core-rules`) for **public** code
  from another package.
- Never reach into another package's `src/` or `dist/` directly. If you
  need something, export it from that package's `index.ts`.
- Apps may depend on packages. Packages must not depend on apps.
- Packages must not import from `tools/*`.

## Errors

- **Throw `Error` subclasses, not plain strings.** Each package may define
  a small set of named errors (e.g. `RuleParseError`, `AuditConfigError`).
- **Errors carry context, not user-facing copy.** User-facing messages
  belong to the CLI / API layer that catches the error, not to the
  thrown error itself.
- **Validate at boundaries.** Use Zod (introduced in later phases) for
  parsing external input — CLI flags, HTTP requests, file contents.
  Internal callers can trust that data is already validated.
- **No silent catches.** If you catch an error, either re-throw it,
  convert it into a typed result, or log it with enough context to
  diagnose later. `try { ... } catch {}` is a code-review block.

## Logging

- The CLI writes human-readable output to `stdout` and diagnostics to
  `stderr`. JSON output is gated behind `--json` so scripts can parse it.
- The API uses structured JSON logs (one event per line) so Cloudflare
  log streams remain greppable. Never `console.log` from a Worker; use
  the package-level logger introduced in Phase 9.
- Never log secrets, tokens, or request bodies that may contain them.
  Redact at the source.

## Comments

- **Default: write no comments.** Names should carry the meaning.
- Add a comment when **why** is non-obvious — a hidden constraint, a
  workaround for an upstream bug, a subtle invariant that would
  surprise a future reader. Reference the issue or commit that
  motivated it.
- Do not describe **what** the next line does. `// loop over users`
  above `for (const user of users)` is noise.
- Do not leave dated breadcrumbs (`// TODO(Alice, 2025-03)`); they
  rot. File a tracked issue and link to it (`// TODO: https://… — short note`).
- JSDoc is reserved for public, exported APIs that are not
  self-explanatory from types — typically the entry-point functions of
  `core-rules`, `core-mcp`, `cli-sherpa`, and `cli-aimcp`.

## Imports

- ESM throughout. `type: "module"` is set on every workspace package.
- Order, enforced by ESLint:
  1. Node built-ins (`node:fs`, `node:path`).
  2. External packages (npm, then `@sherpa-labs/*`).
  3. Local relative imports.
- Use `node:` prefixes for built-ins (`import { readFile } from 'node:fs/promises'`).
- Use named imports. Avoid `import * as foo` unless the module genuinely
  publishes a namespace.

## Testing

- Vitest is the standard runner (added per-package in later phases).
- Tests live next to the file under test as `<name>.test.ts`. Large
  feature areas may use a sibling `tests/` directory.
- One assertion per `it(...)` when possible. Group with `describe(...)`
  by behaviour, not by method name.
- Every bug fix lands with a regression test. Every new feature lands
  with at least one happy-path test.
- Integration tests for `apps/api` hit a real Postgres (Neon branch),
  not a mock. Unit tests for `core-*` packages stay pure.

## Public API changes

Every change to a published package's exported surface is breaking until
proven otherwise:

- **Add an export** → minor changeset.
- **Rename or remove an export** → major changeset, accompanied by a
  migration note in the changeset body.
- **Change the shape of a return type** → major changeset.
- **Change a function's behaviour without changing the type** → minor
  or major depending on observable effect; err on the side of major.

CLI flag changes follow the same rules — flags are public surface.

## Formatting

Prettier handles the mechanical bits. The values listed here are what is
locked in `@sherpa-labs/shared-config/prettier`:

- Single quotes (`'foo'`), trailing commas (`all`), semicolons on.
- 100-column print width.
- Two-space indent.
- Markdown wraps at 80 columns for readability; long URLs are allowed
  to overflow.

Run `pnpm format` to apply, `pnpm format:check` to verify. The
pre-commit hook does this automatically on staged files.

## Linting

ESLint configuration is centralised in
`@sherpa-labs/shared-config/eslint`. A handful of project-wide rules
worth calling out:

- `@typescript-eslint/no-explicit-any` — error.
- `@typescript-eslint/no-floating-promises` — error. Await it, `.catch`
  it, or assign it to a `void` expression with a comment explaining why.
- `import/no-cycle` — error. Cycles indicate a missing layer.
- `no-restricted-syntax` — `console.log` is banned outside CLIs.

Disabling a rule with `// eslint-disable-next-line` is acceptable only
with a one-line justification.

## Documentation

- Every published package ships with a `README.md`. Keep it small:
  what the package is, one example, link to the wider docs.
- Architecture-level changes (new package, new app, shifting a
  responsibility between packages) require a matching update to
  [`ARCHITECTURE.md`](./ARCHITECTURE.md) and, when the choice is
  non-obvious, a new ADR.
- User-facing CLI flag and API changes are documented in the same PR
  that introduces them, not in a follow-up.

## Anti-patterns to avoid

- **Premature abstraction.** Three call sites that look similar are not
  a pattern — wait for the fourth.
- **Speculative configuration.** Do not add a config option until a
  caller needs it. Defaults should be the only path for the first user.
- **Half-implementations.** Either ship the feature or do not start it.
  No "// TODO: implement" stubs in `main`.
- **Backwards-compatibility shims for unreleased APIs.** Pre-1.0 packages
  are allowed to break callers freely; lean on changesets to communicate it.
- **Cross-package circular imports.** If two packages need each other,
  one of them is incorrectly factored.
