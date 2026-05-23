# Project With Lots of Code Examples

## React Hooks

Custom hooks live in `src/hooks/`. They MUST start with `use`.

```ts
export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(handle);
  }, [value, ms]);
  return debounced;
}
```

## Server Actions

```tsx
'use server';

export async function createPost(formData: FormData) {
  const title = formData.get('title');
  if (typeof title !== 'string' || title.length === 0) {
    throw new Error('title required');
  }
  return db.posts.create({ data: { title } });
}
```

## Shell Snippet

```sh
pnpm install
pnpm dev
```

## Plain Code Block (no language tag)

```
just some text
no syntax highlighting
```

## SQL

```sql
SELECT id, email
FROM users
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 100;
```
