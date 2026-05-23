# API Design Guidelines

## URL Shape

- MUST use plural nouns for collection resources (`/users`, `/orders`).
- MUST NOT use verbs in path segments; verbs belong to HTTP methods.
- SHOULD use kebab-case for multi-word resources.

## Pagination

- MUST paginate any list endpoint that can return more than 50 items.
- SHOULD use cursor-based pagination over offset-based.

## Versioning

- MUST version via URL prefix: `/api/v1/...`.
- MUST NOT break a published version; create v2 instead.

## Errors

- MUST return RFC 7807 problem-details JSON on errors.
- MUST include a stable `code` field; never break a documented code.

## Idempotency

- SHOULD support an `Idempotency-Key` header on mutating endpoints.
