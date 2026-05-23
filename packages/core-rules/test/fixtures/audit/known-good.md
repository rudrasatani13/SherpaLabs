# Sherpa Agent Rules

## Stack Context

- MUST treat this repository as a TypeScript Next.js app managed with pnpm.
- SHOULD keep React component changes close to their route or feature folder.
- MAY add small shared utilities when two or more features use the same logic.

## Workflow

- MUST run `pnpm lint` and `pnpm test` before handing off behavior changes.
- SHOULD prefer small commits that isolate parser, audit, and UI changes.
- DO NOT change generated files unless the build step created them.

## Testing

- MUST add or update Vitest coverage when parser, stack detection, or audit scoring behavior changes.
- SHOULD include both accepted and rejected cases for deterministic heuristics.
- MAY use focused fixtures when the full repository fixture would hide the behavior under test.

## Example

For example, keep TypeScript component examples short and executable:

```tsx
export function StatusBadge({ label }: { label: string }) {
  return <span data-testid="status-badge">{label}</span>;
}
```

## Handoff

- MUST summarize changed files, commands run, and verification results.
- SHOULD call out any unresolved risk in the final response.
