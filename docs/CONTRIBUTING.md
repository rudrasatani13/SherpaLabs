# Contributing to Sherpa Labs

Thanks for your interest in contributing. This document covers how the repository is structured for collaboration: branches, commits, pull requests, and release management. For machine setup, see [`SETUP.md`](./SETUP.md).

## Repository layout at a glance

This is a pnpm workspace monorepo. The two top-level groups have different licensing and release semantics:

- `packages/*` — published to npm under the `@sherpa-labs/` scope, MIT-licensed.
- `apps/*` — proprietary, deployed binaries (`@sherpa-labs/api`, `@sherpa-labs/web`). Not published to npm.

Changesets are used to version and publish the public packages only — apps are explicitly listed in `.changeset/config.json` under `ignore`.

## Branch strategy

We use a long-lived integration branch with short-lived topic branches:

| Branch        | Purpose                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| `main`        | Production. Every commit is releasable. Protected: PR + passing CI required.             |
| `develop`     | Integration / staging. Default target for feature work. Merges into `main` on release.   |
| `feature/<slug>` | New functionality. Branched from `develop`, merged back via PR.                       |
| `fix/<slug>`  | Bug fixes against `develop`. Use `hotfix/<slug>` against `main` for urgent prod issues.  |
| `chore/<slug>`| Tooling, docs, dependency bumps that do not change product behaviour.                    |

**Workflow:**

1. `git switch develop && git pull`
2. `git switch -c feature/parse-claude-md`
3. Commit using Conventional Commits (see below).
4. Add a changeset if a public package changed: `pnpm changeset`.
5. Open a PR against `develop`. CI must pass and at least one reviewer must approve.
6. After merge to `develop`, a Changesets release PR opens automatically against `main` aggregating queued changes.
7. Merging the release PR into `main` publishes packages to npm.

## Commit messages — Conventional Commits

All commits on `develop` and `main` follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). The format is:

```
<type>(<scope>): <short summary>

<body>

<footer>
```

### Allowed types

| Type       | When to use                                                                  | Triggers release? |
| ---------- | ---------------------------------------------------------------------------- | ----------------- |
| `feat`     | New user-visible feature                                                     | minor             |
| `fix`      | Bug fix                                                                      | patch             |
| `perf`     | Performance improvement with no behavioural change                           | patch             |
| `refactor` | Code change that neither fixes a bug nor adds a feature                      | no                |
| `docs`     | Documentation only                                                           | no                |
| `test`     | Adding or fixing tests                                                       | no                |
| `build`    | Build system, bundler, or dependency changes                                 | no                |
| `ci`       | CI configuration                                                             | no                |
| `chore`    | Internal housekeeping; no production code change                             | no                |
| `revert`   | Reverts a prior commit; include `Refs: <hash>` in the footer                 | depends           |

Releases are driven by **changesets**, not commit types — the table above is a guideline for which commits typically warrant one.

### Scope

Scope is the package or app touched, without the `@sherpa-labs/` prefix. Examples: `cli-aimcp`, `core-rules`, `api`, `web`, `shared-types`. Use `repo` for repo-wide changes that do not belong to a single workspace.

### Breaking changes

Mark breaking changes by either appending `!` after the type/scope or adding a `BREAKING CHANGE:` footer:

```
feat(core-rules)!: rename AuditResult.violations to AuditResult.findings

BREAKING CHANGE: AuditResult.violations has been renamed to AuditResult.findings to
align with the public API naming used by the dashboard.
```

The corresponding changeset must be `major`.

### Examples

```
feat(cli-aimcp): support .cursor/rules/*.md directory rule sets
fix(core-rules): handle UTF-8 BOM at the start of CLAUDE.md
docs(repo): add architecture overview to README
chore(deps): bump typescript to 5.6.3
ci: cache pnpm store between workflow runs
```

## Pull requests

- One logical change per PR. Big refactors are easier to review when split.
- Target `develop` unless you are cutting a hotfix into `main`.
- Fill in every section of the PR template (`.github/PULL_REQUEST_TEMPLATE.md`).
- Link the issue you are closing with `Closes #123` in the description.
- CI must be green. The pipeline runs lint, typecheck, tests, and build.
- At least one approving review from a maintainer is required.
- Squash-and-merge is the default. The squashed commit message is what lands on `develop`, so make sure it is Conventional Commits–compliant.

### What reviewers look for

- Correctness — the change does what it claims and existing behaviour is preserved.
- Public API surface — any change to exported types or CLI flags requires a changeset.
- Test coverage — bug fixes ship with a regression test; features ship with happy-path tests.
- Documentation — public-facing changes update README / docs in the same PR.

## Changesets

Whenever your change affects a published package, add a changeset:

```sh
pnpm changeset
```

Pick the affected packages, choose `patch` / `minor` / `major`, and write a one-line summary that will end up in the changelog. Commit the generated `.changeset/<slug>.md` file alongside the change.

Changes that only touch `apps/api`, `apps/web`, docs, tooling, or tests do **not** need a changeset — they are not published to npm.

`pnpm changeset:status` shows which packages have queued changes.

## Code style

- TypeScript strict mode everywhere. No `any`.
- Two-space indent, single quotes, trailing commas, 100-char line width.
- ESLint and Prettier are wired into a pre-commit hook (added in Phase 5). CI will reject malformed code.
- Prefer editing existing files over creating new ones.
- Comments explain *why* something non-obvious is the case, not *what* the code does.

## Getting help

Open a draft PR early and ask questions in the description, or file an issue with the `question` label.
