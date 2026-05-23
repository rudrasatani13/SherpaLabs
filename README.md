# Sherpa Labs

Better rules. Smarter agents.

Sherpa Labs is a monorepo containing the open-source `aimcp-lint` CLI, the commercial `sherpa` CLI, a Next.js dashboard, a Cloudflare Workers API, and the shared core packages that power them.

## Monorepo layout

```
.
├── apps/
│   ├── api/            # Hono on Cloudflare Workers — backend API (closed-source)
│   └── web/            # Next.js 14 dashboard (closed-source)
├── packages/
│   ├── cli-aimcp/      # aimcp-lint CLI (open-source, MIT)
│   ├── cli-sherpa/     # sherpa CLI (open-source, MIT)
│   ├── core-rules/     # Parsing + audit engine for agent rule files
│   ├── core-mcp/       # MCP protocol parsing + lint rules engine
│   ├── shared-types/   # Cross-package TypeScript types
│   └── shared-config/  # ESLint, Prettier, and tsconfig presets
├── docs/               # Architecture, setup, and contributor documentation
└── tools/              # Build scripts and release helpers
```

Each `apps/*` and `packages/*` directory is a pnpm workspace package. Workspace dependencies are wired with the `workspace:*` protocol, and TypeScript project references at the root tie them together for incremental builds.

## Requirements

- Node.js **22.22.3** (pinned in `.nvmrc`)
- pnpm **11.1.3** (pinned via `packageManager` in `package.json`)

Full machine setup lives in [`docs/SETUP.md`](./docs/SETUP.md).

## Getting started

```sh
nvm use            # picks up .nvmrc → Node 22.22.3
corepack enable    # activates the pinned pnpm version
pnpm install       # installs all workspaces in one pass
pnpm typecheck     # tsc --build --dry across all project references
```

## Workspace scripts

| Command | What it does |
| --- | --- |
| `pnpm install` | Install dependencies for every workspace, deduplicated through the root lockfile |
| `pnpm build` | Run `tsc --build` across all referenced TypeScript projects |
| `pnpm build:clean` | Remove all `tsc --build` outputs and incremental cache |
| `pnpm typecheck` | Dry-run the project graph — fails on missing references or stale builds |
| `pnpm assets` | Rasterise brand SVG masters into the favicon + OG PNG set (see [`docs/BRAND.md`](./docs/BRAND.md)) |

Per-package scripts live inside each `apps/*`, `packages/*`, or `tools/*` directory; invoke them with `pnpm --filter <package-name> <script>`.

## Tech stack

The platform-wide tech stack is documented in `SHERPA_LABS_MASTER_PLAN.md`. The most relevant choices for this scaffold:

- **Monorepo:** pnpm workspaces
- **Language:** TypeScript (strict mode everywhere)
- **CLI framework:** Commander.js + tsup (introduced in later phases)
- **Backend runtime:** Hono on Cloudflare Workers (introduced in later phases)
- **Frontend:** Next.js 14 App Router (introduced in later phases)

## Licenses

- `packages/*` are MIT-licensed — see each package's `LICENSE` file.
- `apps/*` are proprietary (all rights reserved) — see each app's `LICENSE` file.
- The repo-root `LICENSE` is MIT and applies to build configuration, docs, and tooling not otherwise marked.

## Documentation

Everything a new contributor needs to navigate the project lives under [`docs/`](./docs/):

| Doc | What's in it |
| --- | --- |
| [`docs/SETUP.md`](./docs/SETUP.md) | One-time machine setup — Node, pnpm, gh, Wrangler, editor extensions |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Monorepo layout, what each workspace does, runtime data flows |
| [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) | Branching, commits, PR workflow, Changesets release flow |
| [`docs/CODING_STANDARDS.md`](./docs/CODING_STANDARDS.md) | Naming conventions, file organisation, common patterns |
| [`docs/DECISIONS/`](./docs/DECISIONS/) | Architecture Decision Records — start with [001](./docs/DECISIONS/001-monorepo-with-pnpm.md) |
| [`docs/BRAND.md`](./docs/BRAND.md) | Name, palette, typography, asset rules |
| [`docs/GITHUB_SETUP.md`](./docs/GITHUB_SETUP.md) | Steps for taking the repo public |
| [`docs/PHASE4_EXTERNAL_SETUP.md`](./docs/PHASE4_EXTERNAL_SETUP.md) | External account setup (npm scope, domain, email routing, Paddle KYC) |

Project strategy and the phase-by-phase build plan live at the repo root:

- [`SHERPA_LABS_MASTER_PLAN.md`](./SHERPA_LABS_MASTER_PLAN.md) — product, pricing, positioning, tech stack rationale.
- [`SHERPA_LABS_DEVELOPMENT.md`](./SHERPA_LABS_DEVELOPMENT.md) — every implementation phase, in order.
