# Testing Conventions

## Layers

- Unit tests live next to the file under test.
- Integration tests live in `tests/integration/`.
- End-to-end tests live in `tests/e2e/`.

## Rules

- MUST write a failing test before fixing a bug; commit the test in the same PR.
- MUST NOT skip tests in main; mark with `it.todo` and open a tracking issue instead.
- SHOULD avoid mocks unless they make the test materially clearer.
- SHOULD use Testing Library queries by accessibility role first.

## Coverage

- SHOULD keep coverage above 80% on changed lines.
- MAY accept lower coverage on generated code with reviewer sign-off.

## Test Data

- MUST use factories (`tests/factories/`) over inline fixtures.
- MUST NOT depend on production-like seed data; tests own their setup.
