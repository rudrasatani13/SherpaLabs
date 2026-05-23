# Architecture

This document describes how the Sherpa Labs repository is structured: the
monorepo layout, what each workspace package contributes, how data flows
through the system at runtime, and the conventions that keep the pieces
composable. It is intended as the first stop for a new contributor who needs
to find their bearings without reading the entire codebase.

For the product vision and tech-stack rationale, see
[`SHERPA_LABS_MASTER_PLAN.md`](../SHERPA_LABS_MASTER_PLAN.md). For the
phase-by-phase build plan, see
[`SHERPA_LABS_DEVELOPMENT.md`](../SHERPA_LABS_DEVELOPMENT.md). For the
"why pnpm + workspaces" decision, see
[`DECISIONS/001-monorepo-with-pnpm.md`](./DECISIONS/001-monorepo-with-pnpm.md).

## Top-level layout

```
.
├── apps/                      # Deployed binaries (proprietary, not published)
│   ├── api/                   # Hono on Cloudflare Workers — backend API
│   └── web/                   # Next.js 14 App Router — dashboard
├── packages/                  # Reusable libraries + CLIs (MIT, npm-published)
│   ├── cli-aimcp/             # aimcp-lint — open-source MCP linter CLI
│   ├── cli-sherpa/            # sherpa — commercial CLI for rule audits
│   ├── core-rules/            # Rule-file parsing + audit engine
│   ├── core-mcp/              # MCP protocol parsing + lint rules
│   ├── shared-types/          # Cross-package TypeScript types
│   └── shared-config/         # ESLint, Prettier, tsconfig presets
├── tools/                     # Build helpers (not published)
│   └── asset-build/           # Rasterises brand SVGs into PNG/favicon set
├── docs/                      # Architecture, setup, contributor docs
│   └── DECISIONS/             # Architecture Decision Records (ADRs)
├── .changeset/                # Changesets config + queued release notes
├── .github/                   # PR template + GitHub Actions workflows
├── .husky/                    # Git hooks (pre-commit lint-staged, etc.)
├── SHERPA_LABS_MASTER_PLAN.md # Product strategy, pricing, positioning
├── SHERPA_LABS_DEVELOPMENT.md # Phase-by-phase implementation plan
└── package.json               # Root workspace config + cross-cutting scripts
```

Every directory under `apps/`, `packages/`, and `tools/` is a pnpm workspace
package. Workspace-internal dependencies use the `workspace:*` protocol so
local source — not a published version — is always linked. TypeScript project
references at the repo root (`tsconfig.json`) tie the packages together for
incremental builds (`pnpm build`, `pnpm typecheck`).

## Workspace groups

Three groups exist, and they differ in **licensing**, **release path**, and
**deployment target**. New code must land in the correct group:

| Group        | License     | Published to npm     | Deployed          | Examples                                            |
| ------------ | ----------- | -------------------- | ----------------- | --------------------------------------------------- |
| `apps/*`     | Proprietary | No                   | Cloudflare/Vercel | `@sherpa-labs/api`, `@sherpa-labs/web`              |
| `packages/*` | MIT         | Yes (via Changesets) | n/a               | `@sherpa-labs/cli-aimcp`, `@sherpa-labs/core-rules` |
| `tools/*`    | MIT         | No                   | n/a (local-only)  | `@sherpa-labs/asset-build`                          |

`apps/*` and `tools/*` are excluded from Changesets publishing (see
`.changeset/config.json`). Only `packages/*` reaches end users via npm.

## Apps

### `apps/api` — Backend API

- **Runtime:** Hono on Cloudflare Workers.
- **Role:** Authenticated REST/JSON API consumed by the web dashboard and the
  `sherpa` CLI. Handles audit submissions, workspace/repo/subscription state,
  Paddle webhooks, and (later) canonical-rule sync.
- **Persistence:** Neon Postgres via Drizzle ORM (added in a later phase).
- **Dependencies on workspace packages:** `core-rules`, `core-mcp`,
  `shared-types`, `shared-config`.

### `apps/web` — Dashboard

- **Runtime:** Next.js 14 App Router, deployed on Vercel.
- **Role:** End-user dashboard. Marketing pages, sign-in (Clerk),
  subscription management (Paddle), audit history, canonical-rule editor.
- **Dependencies on workspace packages:** `shared-types`, `shared-config`.
- The web app **does not** import `core-rules` or `core-mcp` directly — it
  talks to the API instead. This keeps proprietary audit logic on the server
  side and keeps the client bundle small.

## Packages

### `packages/shared-types`

- **Purpose:** Single source of truth for TypeScript types that cross
  package boundaries: domain entities (`User`, `Workspace`, `Repo`,
  `Subscription`), parsed-rule shapes (`RuleSet`, `RuleFile`), audit
  outcomes (`AuditResult`, `Violation`), and the `ApiResponse<T>` envelope.
- **Imports from:** nothing else in the monorepo. This package sits at the
  bottom of the dependency graph so it can be safely imported from
  everywhere.
- **Exports:** `.d.ts` types only — no runtime code. Tree-shakeable from
  any consumer.

### `packages/shared-config`

- **Purpose:** Distributes the shared developer-tooling presets so every
  workspace lints, formats, and type-checks identically.
- **Exports:** `tsconfig.base.json`, `tsconfig.node.json`, `tsconfig.edge.json`,
  `tsconfig.nextjs.json`, `eslint.config.js`, `prettier.config.js`.
- **Imports from:** nothing else in the monorepo. Every other package
  consumes this one.

### `packages/core-rules`

- **Purpose:** Parses Markdown-style agent rule files (CLAUDE.md,
  AGENTS.md, `.cursorrules`, `.cursor/rules/*.md`, `.windsurfrules`,
  `.continue/config.yaml`) into a normalised `RuleSet` and audits them
  against the Sherpa rule catalogue.
- **Consumers:** `cli-sherpa` (local audits), `apps/api` (cloud audits).
- **Imports from:** `shared-types`, `shared-config`.

### `packages/core-mcp`

- **Purpose:** Parses MCP (Model Context Protocol) server manifests and
  lint rules; the audit engine for `aimcp-lint`.
- **Consumers:** `cli-aimcp` (local linting), `apps/api` (cloud variant).
- **Imports from:** `shared-types`, `shared-config`.

### `packages/cli-aimcp` — `aimcp-lint`

- **Purpose:** Free, open-source CLI for linting MCP servers. Ships as a
  thin Commander.js wrapper around `core-mcp`.
- **Distribution:** Published to npm as `@sherpa-labs/cli-aimcp` with the
  `aimcp-lint` bin.
- **Imports from:** `core-mcp`, `shared-types`, `shared-config`.

### `packages/cli-sherpa` — `sherpa`

- **Purpose:** Commercial CLI. Commands include `sherpa init`,
  `sherpa audit`, `sherpa convert`, and (later phases) `sherpa sync`.
  Ships as a thin Commander.js wrapper around `core-rules` with optional
  API authentication for cloud features.
- **Distribution:** Published to npm as `@sherpa-labs/cli-sherpa` with the
  `sherpa` bin.
- **Imports from:** `core-rules`, `shared-types`, `shared-config`.

## Tools

### `tools/asset-build`

- **Purpose:** Rasterises the brand SVG masters into the favicon, OG, and
  social-card PNG set documented in [`BRAND.md`](./BRAND.md).
- **When it runs:** Manually via `pnpm assets` whenever brand artwork
  changes. Not part of CI.
- **Not published.** Internal only.

## Dependency graph

```
                ┌────────────────────────┐
                │   shared-config        │
                │   (eslint/prettier/ts) │
                └──────────┬─────────────┘
                           │
                ┌──────────┴─────────────┐
                │   shared-types         │
                │   (cross-cutting .d.ts)│
                └─────┬─────────────┬────┘
                      │             │
        ┌─────────────▼───┐   ┌─────▼────────┐
        │   core-rules    │   │   core-mcp   │
        └────┬────────────┘   └──┬───────────┘
             │                   │
   ┌─────────▼──────┐   ┌────────▼────────┐
   │  cli-sherpa    │   │  cli-aimcp      │
   └─────────┬──────┘   └────────┬────────┘
             │                   │
             └─────┬─────────────┘
                   ▼
            ┌───────────────┐          ┌───────────────┐
            │   apps/api    │◄────────►│   apps/web    │
            │  (Hono / CF)  │   HTTP   │ (Next.js/Vercel)│
            └───────────────┘          └───────────────┘
```

Arrows point from consumer to provider. Two rules keep this graph acyclic:

1. **Nothing in `packages/*` imports from `apps/*`.** Apps are the leaves.
2. **`apps/web` never imports `core-rules` or `core-mcp` directly.** The
   audit engine stays server-side; the dashboard talks to `apps/api`
   over HTTP.

## Runtime data flows

### CLI audit (local-only)

```
developer ── runs ── sherpa audit
                       │
                       ├─► core-rules: locate rule files in cwd
                       ├─► core-rules: parse → RuleSet
                       ├─► core-rules: audit → AuditResult
                       └─► CLI: render scorecard + violations
```

No network call. Free tier and offline use are first-class — anyone can
run `sherpa audit` against their repo with no account.

### CLI audit (cloud-backed, paid tier)

```
developer ── runs ── sherpa audit --remote
                       │
                       ├─► core-rules: parse → RuleSet (local)
                       ├─► HTTPS POST /audits  ─────────────► apps/api (Hono on CF Workers)
                       │       (auth: Clerk session token)        │
                       │                                          ├─► verify subscription
                       │                                          ├─► persist AuditResult (Neon/Drizzle)
                       │                                          └─► return AuditResult + summary URL
                       └─► CLI: render scorecard + dashboard link
```

The same `core-rules` parse path runs on the CLI and on the Worker — the
package is isomorphic. The "cloud" portion is storage, history, team
sharing, and AI-augmented suggestions, not the parse itself.

### Dashboard

```
browser ──► apps/web (Next.js, Vercel)
              │
              ├─► Clerk for auth (client-side + server actions)
              ├─► HTTPS to apps/api for audit history, repos, billing state
              └─► Paddle.js for checkout overlays
                        │
                        └─► webhook ──► apps/api ──► update Subscription in Postgres
```

The dashboard is a thin presentation layer. Domain logic lives in
`apps/api` and `packages/core-*`.

## Configuration & secrets

- **Runtime config** for `apps/api` lives in `wrangler.toml` plus
  Cloudflare secrets (`wrangler secret put`).
- **Runtime config** for `apps/web` lives in Vercel environment variables.
- **Build-time config** (TS, ESLint, Prettier) is centralised in
  `@sherpa-labs/shared-config` — never duplicate these per package.
- **Workspace constraints** — Node and pnpm versions are pinned in
  `.nvmrc` and `package.json#packageManager` respectively; CI fails when
  they drift.

## Build pipeline

- `pnpm install` — resolves all workspaces against the root lockfile.
- `pnpm build` — runs `tsc --build` across the project-reference graph
  defined in the root `tsconfig.json`. Incremental: a downstream change
  rebuilds only the affected packages.
- `pnpm typecheck` — `tsc --build --dry`; CI uses this to catch stale
  references without writing artefacts.
- `pnpm lint` / `pnpm format` — shared ESLint and Prettier across the
  whole repo. Both run pre-commit via Husky + lint-staged.

## Release pipeline

- Public packages (`packages/*`) version and publish via
  [Changesets](https://github.com/changesets/changesets). Each PR that
  changes a published package must include a `.changeset/*.md` entry.
- Apps (`apps/*`) and tools (`tools/*`) are excluded from publishing
  (see `.changeset/config.json#ignore`).
- See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full PR + release
  flow.

## Where to put new code

| If you are adding…                       | Put it in…                       |
| ---------------------------------------- | -------------------------------- |
| A type shared by more than one workspace | `packages/shared-types`          |
| A lint, format, or compiler preset       | `packages/shared-config`         |
| Rule-file parsing or audit logic         | `packages/core-rules`            |
| MCP-server parsing or lint logic         | `packages/core-mcp`              |
| A `sherpa` CLI subcommand                | `packages/cli-sherpa`            |
| An `aimcp-lint` CLI subcommand           | `packages/cli-aimcp`             |
| A new API route                          | `apps/api`                       |
| A new dashboard page or component        | `apps/web`                       |
| A local-only build helper                | `tools/<name>`                   |
| Documentation                            | `docs/`                          |
| A repo-wide architectural decision       | `docs/DECISIONS/<NNN>-<slug>.md` |

When you are unsure which layer a piece of logic belongs to, ask: _will
this run inside the CLI **and** inside the Worker?_ If yes, it belongs in
`packages/core-*` or `packages/shared-types`.
