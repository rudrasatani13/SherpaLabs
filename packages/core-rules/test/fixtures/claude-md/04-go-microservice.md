# Go Microservice Guide

## Modules and Layout

- `cmd/<service>` — entry points only; no business logic.
- `internal/` — packages not exported.
- `pkg/` — public reusable packages.

## Concurrency

- MUST pass `context.Context` as the first arg to every blocking call.
- MUST NOT spawn unbounded goroutines; use a worker pool or `errgroup`.
- SHOULD respect `ctx.Done()` in every long-running loop.

## Error Handling

- MUST wrap errors with `fmt.Errorf("%s: %w", op, err)`.
- MUST NOT panic in library code; reserve panic for unrecoverable invariants.

## Testing

- SHOULD use table-driven tests.
- SHOULD use `t.Parallel()` for independent test cases.
- MAY use `testcontainers-go` for integration tests.

## Observability

- MUST emit structured JSON logs.
- MUST propagate trace IDs across service boundaries.
