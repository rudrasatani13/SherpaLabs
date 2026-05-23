import { createHash } from 'node:crypto';

export type JsonPrimitive = string | number | boolean | null;

export type JsonCompatible =
  | JsonPrimitive
  | readonly JsonCompatible[]
  | { readonly [key: string]: JsonCompatible };

export interface DeterministicIdOptions {
  length?: number;
  prefix?: string;
}

export function deterministicHash(value: string | JsonCompatible): string {
  const input = typeof value === 'string' ? value : stableStringify(value);

  return createHash('sha256').update(input).digest('hex');
}

export function deterministicId(
  value: string | JsonCompatible,
  options: DeterministicIdOptions = {},
): string {
  const length = options.length ?? 16;

  if (!Number.isInteger(length) || length < 1 || length > 64) {
    throw new RangeError('length must be an integer between 1 and 64.');
  }

  const hash = deterministicHash(value).slice(0, length);

  return options.prefix == null ? hash : `${options.prefix}_${hash}`;
}

export function stableStringify(value: JsonCompatible): string {
  return stringifyValue(value, new WeakSet<object>());
}

function stringifyValue(value: JsonCompatible, seen: WeakSet<object>): string {
  if (value == null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('JSON-compatible numbers must be finite.');
    }

    return JSON.stringify(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    return stringifyArray(value, seen);
  }

  return stringifyObject(value as Readonly<Record<string, JsonCompatible>>, seen);
}

function stringifyArray(value: readonly JsonCompatible[], seen: WeakSet<object>): string {
  assertUnseen(value, seen);

  const result = `[${value.map((item) => stringifyValue(item, seen)).join(',')}]`;
  seen.delete(value);

  return result;
}

function stringifyObject(
  value: Readonly<Record<string, JsonCompatible>>,
  seen: WeakSet<object>,
): string {
  assertUnseen(value, seen);

  const result = `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stringifyValue(value[key] ?? null, seen)}`)
    .join(',')}}`;

  seen.delete(value);

  return result;
}

function assertUnseen(value: object, seen: WeakSet<object>): void {
  if (seen.has(value)) {
    throw new TypeError('Cannot stableStringify circular values.');
  }

  seen.add(value);
}
