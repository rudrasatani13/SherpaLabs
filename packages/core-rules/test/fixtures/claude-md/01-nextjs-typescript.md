# Project Rules — Next.js TypeScript Monorepo

This project uses Next.js 14 with the App Router. TypeScript strict mode is enabled.

## Code Style

- MUST use ES modules (`import`/`export`); never `require`.
- MUST prefer `const` over `let`; never use `var`.
- SHOULD use named exports unless a default export is idiomatic.
- MAY use arrow functions for small inline callbacks.

## Type Safety

- MUST NOT use `any`. Prefer `unknown` and narrow.
- MUST type all public function signatures explicitly.
- SHOULD use `satisfies` over type assertions where possible.

## Imports

- MUST use the `@/` path alias for app-internal imports.
- MUST sort imports: built-in → external → internal → relative.

## Examples

```ts
import { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/Button';

import { formatDate } from './utils';
```

## Testing

- MUST place tests next to the file they cover with `.test.ts` suffix.
- SHOULD use Vitest, not Jest.
