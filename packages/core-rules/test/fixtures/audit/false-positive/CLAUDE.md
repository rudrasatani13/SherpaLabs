# Agent Rules

## Stack Context

- MUST treat this repository as a TypeScript Next.js application using pnpm.
- SHOULD keep React server and client component boundaries explicit.
- MAY add small helper modules under the nearest feature folder.

## Workflow

- MUST run `pnpm lint` after changing TypeScript source files.
- SHOULD run `pnpm test` when changing parser, audit, or scoring behavior.
- DO NOT edit generated output unless a local build command produced it.

## Examples

For example, keep typed helper examples concrete:

```ts
export function normalizeName(input: string): string {
  return input.trim().toLowerCase();
}
```
