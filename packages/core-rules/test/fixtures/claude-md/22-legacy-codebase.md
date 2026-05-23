# Working in a Legacy Codebase

This codebase started as a Rails 3 monolith in 2012. It has been incrementally extracted into
services since 2019. Expect inconsistency and apply the following rules carefully.

## Touching Old Code

- MUST add a regression test before changing any module without existing coverage.
- SHOULD prefer surgical fixes over refactors in legacy modules.
- MAY refactor only when the change is on the critical path of the current task.

## Compatibility

- MUST NOT break public Ruby gem APIs in this monorepo without a major version bump.
- MUST run the full integration suite locally before merging Ruby changes.

## Migration Strategy

- New services SHOULD use the Phoenix pattern: strangler façade in front of legacy paths.
- New endpoints MUST be Rails 7+ and avoid deprecated `respond_to do |format|` blocks.

## What to Avoid

- AVOID rewriting code that is stable and untouched by the current task.
- AVOID modifying database schemas for cosmetic improvements.
