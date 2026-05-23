# Django Backend Conventions

## App Layout

- One Django app per bounded context.
- Apps live in `apps/<name>/`.

## Models

- MUST add `created_at` and `updated_at` `DateTimeField`s on every model.
- MUST use `on_delete=models.PROTECT` for foreign keys unless cascade is genuinely correct.
- SHOULD avoid `JSONField` for structured data that could be its own table.

## Views

- MUST use class-based views for non-trivial endpoints.
- SHOULD return DRF `Response` objects, not raw `JsonResponse`.

## Migrations

- MUST be reviewed alongside model changes in the same PR.
- MUST avoid renaming columns in the same migration as data changes.

## Async

- MAY use `async def` views only when calling async ORM methods end-to-end.
