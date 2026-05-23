# Monorepo Conventions

## Workspaces

- `apps/*` — deployable units
- `packages/*` — shared libraries
- `tools/*` — internal scripts

## Cross-Package Imports

- MUST import from another package via its public entry, never deep paths.
- MUST NOT introduce circular dependencies; CI fails on cycles.

## Versioning

- SHOULD use Changesets for every user-visible change.
- SHOULD batch related package bumps into one release.

## Build Order

- MUST keep TypeScript project references up to date.
- MUST run `pnpm build` from the root before publishing.
