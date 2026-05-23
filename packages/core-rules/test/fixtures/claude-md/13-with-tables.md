# Project Conventions With Tables

## Supported Targets

| Target  | Version | Notes                |
| ------- | ------- | -------------------- |
| Node    | 22 LTS  | required for builds  |
| Bun     | 1.1+    | dev only             |
| Deno    | n/a     | not supported        |

## File Naming

| Kind        | Convention      | Example          |
| ----------- | --------------- | ---------------- |
| Components  | PascalCase.tsx  | `UserCard.tsx`   |
| Hooks       | useFoo.ts       | `useSession.ts`  |
| Utilities   | kebab-case.ts   | `format-date.ts` |

## Rules

- MUST follow the file naming table above.
- SHOULD update the supported targets table whenever upgrading Node.
