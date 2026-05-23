# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for
Sherpa Labs. An ADR captures one architecturally significant decision,
the context that motivated it, the alternatives considered, and the
consequences accepted in return.

ADRs are **append-only**. We do not edit history — when a decision
changes, we add a new ADR that supersedes the old one and update the
old ADR's `Status` line to point at its successor.

## What goes in an ADR

Anything that future maintainers would have to reverse-engineer from
code if it were not written down. Examples:

- Choosing a runtime, framework, or vendor (Cloudflare Workers vs.
  Vercel Functions; Paddle vs. Stripe).
- Picking a repo shape (single repo, polyrepo, monorepo + workspaces).
- Defining a public-API contract that other packages will build on.
- Setting a guardrail that affects many files (no default exports,
  strict mode everywhere).

Decisions that are *implementation* details — naming a function,
restructuring a file, picking a sort order — do **not** need an ADR.
The PR description is the right home for those.

## What does not go in an ADR

- Implementation playbooks (those belong in `docs/`).
- Phase progress / status updates (those belong in the master
  development plan).
- Bug post-mortems (those belong in an incident write-up, not an ADR).

If you are unsure whether something deserves an ADR, write the title
first. If the title reads like a yes/no question that could plausibly
come up again in 12 months, write the ADR.

## How to add an ADR

1. Copy [`000-template.md`](./000-template.md) to a new file in this
   directory.
2. Name it `<NNN>-<kebab-slug>.md`, where `<NNN>` is the next zero-padded
   number after the last ADR in the directory.
3. Fill in every section. Keep the prose tight — an ADR is usually 1–2
   pages, not a design doc.
4. Reference the ADR from any code or doc that depends on it.
5. Open the PR alongside the change the ADR is justifying. The PR
   description should link to the ADR.

## How to supersede an ADR

When a later decision invalidates an earlier one:

1. Write the new ADR. Reference the old one in its `Context` section.
2. Edit the old ADR's `Status` line: `Superseded by [NNN](./NNN-<slug>.md)`.
3. Do **not** delete or rewrite the old ADR's content. The reasoning at
   the time was valid; future readers need to see it.

## Status values

| Value         | Meaning                                                         |
| ------------- | --------------------------------------------------------------- |
| `Proposed`    | Drafted, not yet adopted. Open for discussion in the PR.        |
| `Accepted`    | Adopted. The codebase has been (or will be) brought in line.    |
| `Superseded`  | Replaced by a later ADR; kept for historical context.           |
| `Deprecated`  | No longer relevant (e.g. the relevant subsystem was removed).   |

## Index

| # | Title                                                        | Status   |
| - | ------------------------------------------------------------ | -------- |
| [001](./001-monorepo-with-pnpm.md) | Monorepo with pnpm workspaces       | Accepted |
