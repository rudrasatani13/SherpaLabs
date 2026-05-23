import type { RuleLocation } from '@sherpa-labs/shared-types';

export interface LineColumn {
  readonly line: number;
  readonly column: number;
}

export function computeLineStarts(content: string): readonly number[] {
  const starts: number[] = [0];

  for (let index = 0; index < content.length; index += 1) {
    if (content.charAt(index) === '\n') {
      starts.push(index + 1);
    }
  }

  return starts;
}

export function offsetToLineColumn(offset: number, lineStarts: readonly number[]): LineColumn {
  if (lineStarts.length === 0) {
    return { line: 1, column: offset + 1 };
  }

  let lo = 0;
  let hi = lineStarts.length - 1;

  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const start = lineStarts[mid] ?? 0;

    if (start <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const lineStart = lineStarts[lo] ?? 0;

  return { line: lo + 1, column: offset - lineStart + 1 };
}

export function buildLocation(
  filePath: string | undefined,
  startOffset: number,
  endOffset: number,
  lineStarts: readonly number[],
): RuleLocation {
  const startOffsetClamped = Math.max(0, startOffset);
  const endOffsetClamped = Math.max(startOffsetClamped, endOffset);
  const start = offsetToLineColumn(startOffsetClamped, lineStarts);
  const end = offsetToLineColumn(endOffsetClamped, lineStarts);

  const base = {
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column,
  } satisfies Omit<RuleLocation, 'filePath'>;

  if (filePath === undefined || filePath === '') {
    return base;
  }

  return { ...base, filePath };
}
