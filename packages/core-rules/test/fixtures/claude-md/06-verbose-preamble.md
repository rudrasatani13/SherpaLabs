# A Thoughtful Set of Conventions

We have spent a long time building this codebase. It has evolved through three rewrites, two
acquisitions, and one near-failure during the database migration of 2023. As you work on it,
please understand that the rules below are not arbitrary; they encode lessons learned. Each
section is short, but the reasoning behind it took us months to discover.

We assume the reader is a senior engineer comfortable with TypeScript and distributed systems.
If you are new to these topics, please take a moment to read the linked resources before
applying these rules. We have found that surface-level adherence without understanding leads
to regressions that are difficult to debug because they look intentional.

Below are the rules. They are listed in roughly the order we discovered we needed them.

## Database

- MUST use parameterized queries; never string concatenation.
- MUST run migrations in transactions where possible.

## Caching

- SHOULD invalidate cache keys on write; never rely on TTL alone for correctness.

## Logging

- MUST log a request ID with every log line in request-scoped code.
