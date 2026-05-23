# Shared Testing Rules

- MUST run the package test command before handing off behavior changes.
- SHOULD add a failing fixture before changing parser or audit behavior.
- SHOULD include a passing fixture that proves clean guidance remains clean.
- DO NOT hide deterministic heuristic behavior behind network calls or current-date checks.
- MAY use small focused fixtures when a full repository fixture would make the assertion hard to read.

For example:

```ts
expect(result.score).toBeGreaterThanOrEqual(85);
```
