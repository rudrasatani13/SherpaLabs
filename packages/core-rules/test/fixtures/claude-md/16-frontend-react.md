# React Frontend Conventions

## Components

- MUST be function components; never class components in new code.
- MUST place colocated tests in `__tests__/`.
- SHOULD keep components under 200 lines.

## State

- SHOULD prefer URL state for anything shareable.
- SHOULD prefer server state via React Query for remote data.
- MAY use React context only for genuinely cross-cutting concerns (theme, auth).

## Styling

- MUST use Tailwind utility classes; no CSS modules in new components.
- MUST NOT inline arbitrary hex colors; use the design tokens in `tailwind.config.ts`.

## Accessibility

- MUST set `alt` on every `<img>`; empty string is allowed only for decorative images.
- MUST associate every form input with a label.
- SHOULD test keyboard navigation paths.
