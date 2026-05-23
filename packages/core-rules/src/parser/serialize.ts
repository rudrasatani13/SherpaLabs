import type { RuleSection, RuleSet } from '@sherpa-labs/shared-types';

export interface SerializedFile {
  readonly path: string;
  readonly content: string;
}

export function serializeRuleSet(ruleSet: RuleSet): string {
  const files = serializeRuleSetByFile(ruleSet);

  if (files.length === 0) {
    return '';
  }

  if (files.length === 1) {
    const first = files[0];
    return first === undefined ? '' : first.content;
  }

  return files.map((file) => file.content).join('\n');
}

export function serializeRuleSetByFile(ruleSet: RuleSet): SerializedFile[] {
  const sectionsByPath = new Map<string, RuleSection[]>();

  for (const section of ruleSet.sections) {
    const path = section.location?.filePath ?? '';
    const existing = sectionsByPath.get(path);
    if (existing === undefined) {
      sectionsByPath.set(path, [section]);
    } else {
      existing.push(section);
    }
  }

  return ruleSet.files.map((file) => {
    const sections = sectionsByPath.get(file.path);

    if (sections === undefined || sections.length === 0) {
      return { path: file.path, content: file.content };
    }

    const ordered = [...sections].sort(compareSectionOrder);
    const reconstructed = ordered.map((section) => section.text).join('');

    return { path: file.path, content: reconstructed };
  });
}

export function normalizeForRoundTrip(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');
}

export function roundTripEquals(original: string, serialized: string): boolean {
  return normalizeForRoundTrip(original) === normalizeForRoundTrip(serialized);
}

function compareSectionOrder(a: RuleSection, b: RuleSection): number {
  const aLine = a.location?.startLine ?? 0;
  const bLine = b.location?.startLine ?? 0;

  if (aLine !== bLine) {
    return aLine - bLine;
  }

  const aCol = a.location?.startColumn ?? 0;
  const bCol = b.location?.startColumn ?? 0;

  return aCol - bCol;
}
