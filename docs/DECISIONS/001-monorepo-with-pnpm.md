# 001. Monorepo with pnpm workspaces

- **Status:** Accepted
- **Date:** 2026-05-23
- **Deciders:** Rudra Satani (founder)
- **Supersedes:** —

## Context

Sherpa Labs ships multiple deliverables that share substantial code:

- Two CLIs — `aimcp-lint` (free, OSS) and `sherpa` (commercial) — each
  published to npm under the `@sherpa-labs/` scope.
- A backend API on Cloudflare Workers (Hono) that runs the same rule
  parsing and audit logic as the CLIs, but over HTTP and against a
  Postgres database.
- A Next.js 14 dashboard hosted on Vercel that consumes the API and
  presents audit history, team management, and billing.
- Shared TypeScript types, parsing/audit engines, and tooling presets
  that all of the above must agree on.

These pieces must evolve in lockstep: a change to the `RuleSet` shape
crosses the CLI, the API, and the dashboard simultaneously. Releasing
them out of sync would produce silent type drift between the CLI a user
installs from npm and the API their requests hit.

Sherpa Labs is also a solo-founder project for v1, with an explicit
constraint from the master plan to keep infrastructure cost under
\$50/month and tooling overhead minimal. Whatever repo shape we pick has
to optimise for one contributor's velocity, not for a 50-engineer
platform team.

Three repo shapes were on the table at the start of Phase 2: a single
flat repo, multiple polyrepos, or a workspace monorepo. The choice has
to survive multiple years and gracefully accommodate a small team
later, so it warrants an ADR.

## Decision

We adopt **a single Git repository organised as a pnpm workspaces
monorepo**, with three top-level workspace groups:

- `apps/*` — proprietary deployed binaries (`apps/api`, `apps/web`).
- `packages/*` — MIT-licensed libraries and CLIs, published to npm via
  Changesets.
- `tools/*` — internal-only helpers (e.g. asset rasterisation), not
  published.

We deliberately **do not** add a build orchestrator (Turborepo, Nx) for
v1. The TypeScript project-reference graph and `pnpm -F <pkg>` filtering
already give us incremental builds and per-package scripts.

Public releases go through [Changesets](https://github.com/changesets/changesets).
Apps and tools are listed in `.changeset/config.json#ignore` and never
publish to npm.

## Alternatives considered

- **Polyrepos (one per package/app).** Closer to the npm-native model
  and trivially supports independent release cadences. Rejected because
  every cross-cutting change (e.g. adding a field to `RuleSet`) would
  span four PRs across four repos, four CI pipelines, four version
  bumps, and a publish-and-bump dance to wire it back together. The
  type drift risk between CLI and API is exactly the failure mode we
  want to make impossible by construction. CI cost also scales linearly
  with repo count, which is hostile to the < \$50/month constraint.

- **Single flat repo without workspaces.** Lowest possible setup
  overhead. Rejected because we need to publish the CLIs and core
  packages to npm under stable package names; that requires per-package
  `package.json`, `tsconfig.json`, and independent versioning, which is
  exactly what workspaces provide. Without workspaces, we would
  recreate the workspace machinery by hand.

- **Monorepo with Yarn or npm workspaces (not pnpm).** Yarn 4 and npm 7+
  both ship workspaces and could host the same layout. Rejected for
  three reasons specific to this project:
  1. pnpm's content-addressable store keeps `node_modules` an order of
     magnitude smaller than npm/Yarn hoisting on disk — meaningful
     when the dashboard, CLIs, and Workers each pull tens of MB of deps.
  2. pnpm's strict isolation (a package only sees its own declared
     dependencies) catches phantom imports at install time. With the
     CLI shipping to end-user machines, leaking an undeclared dep into
     a published package would be a real user-visible bug.
  3. pnpm `workspace:*` protocol prevents accidental external version
     resolution during publish; Changesets understands and rewrites it.

- **Monorepo + Turborepo / Nx.** Both add a remote build cache and a
  pipeline DSL on top of workspaces. Rejected for v1 because:
  - With a single contributor on one machine, the local `tsc --build`
    incremental cache already provides what Turbo's local cache would.
  - Remote caching is a paid SaaS dependency (Turbo) or self-hosted
    infra (Nx Cloud / self-host), neither of which is justified before
    the team has > 1 engineer or CI build minutes become a bottleneck.
  - Adding the orchestrator later is a non-breaking, mechanical change.
    Adding it now bakes a dependency in for no measurable benefit.

- **Bazel / Rush / Lerna.** Bazel is overkill for a TypeScript-only
  codebase. Rush adds opinionated tooling beyond what we need. Lerna
  has been effectively superseded by Changesets + workspaces for our
  use case. All rejected as premature.

## Consequences

### Positive

- **Atomic cross-package changes.** Renaming an exported type in
  `shared-types` and updating every consumer happens in one PR with
  one review and one CI run.
- **Single lockfile, single install.** `pnpm install` at the root sets
  up the entire workspace. Onboarding goes from "clone N repos and
  link them" to "clone and install."
- **Shared tooling without duplication.** ESLint, Prettier, and tsconfig
  presets live in `@sherpa-labs/shared-config` and are consumed via
  `workspace:*`. No per-repo drift.
- **TypeScript project references give incremental builds for free.**
  Touching `core-rules` rebuilds `core-rules`, `cli-sherpa`, and
  `apps/api`; nothing else.
- **Changesets cleanly separates published vs. private code.** The
  proprietary apps live next to the OSS libraries without risk of
  being accidentally published.
- **Cheap to walk away from.** Workspaces are a thin convention; any
  workspace can be extracted to its own repo by copying the directory
  and adding a `package.json` lockfile.

### Negative

- **Single repository = single permissions boundary.** Anyone with
  read access to the repo sees both the OSS packages and the
  proprietary apps. We mitigate by keeping the repo private until
  Phase 6's external-setup work is complete, and by relying on
  per-app license files rather than repo-level access control.
- **Coupled CI.** A failing test in `apps/web` blocks merging a `core-rules`
  fix unless the CI job graph is set up to short-circuit by changed
  files. This is solvable (path filters in GitHub Actions) but adds
  configuration we would not need with polyrepos.
- **No remote build cache.** Every CI run does a clean
  `pnpm install` + `tsc --build`. Acceptable for v1; revisit when CI
  minutes meaningfully exceed the GitHub free tier.
- **pnpm is less common than npm/Yarn in casual contributors' muscle
  memory.** Mitigated by documenting `corepack enable` in
  [`SETUP.md`](../SETUP.md) and pinning the pnpm version with
  `packageManager`.

### Neutral / follow-ups

- A build orchestrator (Turborepo or Nx) becomes worth reconsidering
  when (a) we have > 1 active contributor, (b) CI wall time exceeds
  5 minutes routinely, or (c) we need remote caching for cold CI
  runners. Until then, project references are sufficient.
- If the proprietary apps ever need to ship to a different audience
  with a different access boundary (e.g. enterprise customer
  on-prem), we should re-evaluate whether `apps/*` stays in the same
  repo.
- The decision applies to the v1 build (Phases 1–80 in
  `SHERPA_LABS_DEVELOPMENT.md`). A future product expansion into a
  second major surface (e.g. a desktop app, a separate
  agent-orchestration product) is a trigger to revisit this ADR.

## References

- [`SHERPA_LABS_MASTER_PLAN.md`](../../SHERPA_LABS_MASTER_PLAN.md) §
  Tech Stack Summary — establishes the constraint "pnpm workspaces
  (no Turborepo for v1)".
- [`SHERPA_LABS_DEVELOPMENT.md`](../../SHERPA_LABS_DEVELOPMENT.md)
  Phase 2 — initial workspace scaffolding.
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — current monorepo layout
  and dependency graph.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — Changesets-driven
  release workflow that this layout enables.
- pnpm workspaces documentation: https://pnpm.io/workspaces
- Changesets documentation: https://github.com/changesets/changesets
