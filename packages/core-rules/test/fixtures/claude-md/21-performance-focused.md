# Performance-Focused Conventions

## Hot Paths

- MUST profile before optimizing; commit the profile in the PR description.
- MUST NOT introduce N+1 queries; use `select_related` / `JOIN` / `dataloader`.

## Caching

- SHOULD cache idempotent read endpoints behind a CDN.
- SHOULD set `Cache-Control` headers explicitly; never rely on defaults.

## Bundle Size

- MUST keep the initial JS payload under 200 KB gzipped.
- MUST NOT add a runtime dependency over 50 KB without justification.

## Database

- SHOULD add an index whenever adding a `WHERE` clause on a new column.
- MAY denormalize for read paths that ship to ≥ 90% of users.

## Memory

- MUST stream large files; never read whole files into memory.
