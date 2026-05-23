# Python FastAPI Service

## Stack

- Python 3.12
- FastAPI 0.115+
- SQLAlchemy 2.x with async sessions
- Postgres 16 via Neon
- Ruff + Black for linting and formatting

## Coding Conventions

- MUST type all function signatures using `from __future__ import annotations`.
- MUST use `async def` for any handler touching IO; never block the event loop.
- SHOULD use Pydantic v2 models for request and response bodies.
- MAY use dataclasses for internal-only structs.

## Project Layout

```
app/
  routers/
  models/
  services/
  schemas/
tests/
  unit/
  integration/
```

## Error Handling

- MUST raise typed `HTTPException` for client-visible errors.
- MUST NOT leak stack traces or SQL fragments in responses.
- SHOULD wrap third-party calls with timeouts.

## Testing

- MUST hit a real Postgres instance in integration tests; no mocks.
- SHOULD write at least one unit test per service function.
