# Security-First Conventions

## Secrets

- MUST NOT commit secrets, tokens, or `.env` files.
- MUST load secrets via environment variables; never from disk paths.
- MUST rotate any secret that has touched git history.

## Input Validation

- MUST validate every external input with Zod (TS) or Pydantic (Py) at the boundary.
- MUST normalize Unicode before comparing user-supplied identifiers.

## Authentication

- MUST use short-lived access tokens (≤ 15 min) and rotating refresh tokens.
- MUST NOT roll our own crypto; use the platform's vetted libraries.

## Logging

- MUST NOT log raw passwords, tokens, or full credit card numbers.
- SHOULD log only the last 4 of any sensitive identifier.

## Dependencies

- MUST run `pnpm audit --prod` in CI; high-severity findings block merge.
- SHOULD pin dependencies in lockfile; review every minor bump.
