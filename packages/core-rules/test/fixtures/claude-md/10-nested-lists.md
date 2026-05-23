# Nested Lists Stress Test

## Coding Layers

- Presentation layer
  - Components in `src/components/`
  - Pages in `src/app/`
    - Server components by default
    - Mark client components with `'use client'`
  - Styles in `src/styles/`
- Domain layer
  - Models in `src/models/`
  - Services in `src/services/`
    - One service per aggregate root
- Infrastructure layer
  - Database access in `src/db/`
  - External APIs in `src/clients/`

## Ordered List Inside Unordered

- Before opening a PR:
  1. Run `pnpm typecheck`
  2. Run `pnpm test`
  3. Run `pnpm lint --fix`
