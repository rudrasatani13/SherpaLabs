import { Buffer } from 'node:buffer';
import { deterministicId } from '@sherpa-labs/core-utils';
import type {
  RuleCodeBlock,
  RuleDirective,
  RuleDirectivePriority,
  RuleFile,
  RuleFileKind,
  RuleHeading,
  RuleParseError,
  RuleSection,
  RuleSet,
} from '@sherpa-labs/shared-types';
import { marked, type Token, type Tokens } from 'marked';
import { makeParseError, type ParseOptions } from './errors.js';
import { buildLocation, computeLineStarts } from './location.js';

type MarkdownKind = Extract<
  RuleFileKind,
  'claude-md' | 'agents-md' | 'windsurf-rules' | 'cursor-rule' | 'cursor-rules'
>;

interface ProtoSection {
  readonly startOffset: number;
  endOffset: number;
  readonly tokens: Token[];
  heading?: { readonly token: Tokens.Heading; readonly offset: number };
}

export function parseMarkdownContent(
  content: string,
  kind: MarkdownKind,
  options: ParseOptions = {},
): RuleSet {
  const filePath = options.filePath;
  const lineStarts = computeLineStarts(content);
  const parseErrors: RuleParseError[] = [];

  let tokens: Token[];

  try {
    tokens = marked.lexer(content);
  } catch (error) {
    parseErrors.push(
      makeParseError(`Failed to tokenize markdown: ${describeError(error)}`, 'error'),
    );
    tokens = [];
  }

  const protoSections = groupTokensIntoSections(tokens);
  const sections: RuleSection[] = [];
  const allCodeBlocks: RuleCodeBlock[] = [];
  const allDirectives: RuleDirective[] = [];

  for (const proto of protoSections) {
    const sectionText = content.slice(proto.startOffset, proto.endOffset);
    const sectionLocation = buildLocation(filePath, proto.startOffset, proto.endOffset, lineStarts);

    const codeBlocks: RuleCodeBlock[] = [];
    const directives: RuleDirective[] = [];

    walkForCodeBlocks(proto.tokens, proto.startOffset, codeBlocks, filePath, lineStarts);
    walkForDirectives(proto.tokens, proto.startOffset, directives, filePath, lineStarts);

    const heading = proto.heading
      ? buildHeading(proto.heading.token, proto.heading.offset, filePath, lineStarts)
      : undefined;

    const sectionId = deterministicId({
      path: filePath ?? '',
      start: proto.startOffset,
      end: proto.endOffset,
      head: heading?.text ?? '',
    });

    const section: RuleSection = heading
      ? {
          id: sectionId,
          text: sectionText,
          heading,
          directives,
          codeBlocks,
          location: sectionLocation,
        }
      : {
          id: sectionId,
          text: sectionText,
          directives,
          codeBlocks,
          location: sectionLocation,
        };

    sections.push(section);
    allCodeBlocks.push(...codeBlocks);
    allDirectives.push(...directives);
  }

  const file = buildRuleFile(content, kind, filePath);
  const ruleSetId = deterministicId({
    kind,
    path: file.path,
    len: content.length,
    sections: sections.length,
  });

  return {
    id: ruleSetId,
    format: kind,
    files: [file],
    sections,
    directives: allDirectives,
    codeBlocks: allCodeBlocks,
    parseErrors,
  };
}

export function buildRuleFile(
  content: string,
  kind: RuleFileKind,
  filePath: string | undefined,
): RuleFile {
  const path = filePath ?? '';
  const sizeBytes = Buffer.byteLength(content, 'utf8');
  const id = deterministicId({ kind, path, len: content.length });

  return { id, path, kind, content, sizeBytes };
}

function groupTokensIntoSections(tokens: Token[]): ProtoSection[] {
  const protoSections: ProtoSection[] = [];
  let current: ProtoSection | null = null;
  let offset = 0;

  for (const token of tokens) {
    const tokenStart = offset;
    const rawLength = typeof token.raw === 'string' ? token.raw.length : 0;
    const tokenEnd = tokenStart + rawLength;

    if (token.type === 'heading') {
      if (current !== null) {
        protoSections.push(current);
      }

      current = {
        startOffset: tokenStart,
        endOffset: tokenEnd,
        tokens: [token],
        heading: { token: token as Tokens.Heading, offset: tokenStart },
      };
    } else if (current === null) {
      current = {
        startOffset: tokenStart,
        endOffset: tokenEnd,
        tokens: [token],
      };
    } else {
      current.tokens.push(token);
      current.endOffset = tokenEnd;
    }

    offset = tokenEnd;
  }

  if (current !== null) {
    protoSections.push(current);
  }

  return protoSections;
}

function buildHeading(
  token: Tokens.Heading,
  offset: number,
  filePath: string | undefined,
  lineStarts: readonly number[],
): RuleHeading {
  const rawLength = typeof token.raw === 'string' ? token.raw.length : 0;

  return {
    depth: token.depth,
    text: token.text.trim(),
    location: buildLocation(filePath, offset, offset + rawLength, lineStarts),
  };
}

function walkForCodeBlocks(
  tokens: readonly Token[],
  baseOffset: number,
  out: RuleCodeBlock[],
  filePath: string | undefined,
  lineStarts: readonly number[],
): void {
  let offset = baseOffset;

  for (const token of tokens) {
    const start = offset;
    const rawLength = typeof token.raw === 'string' ? token.raw.length : 0;
    const end = start + rawLength;

    if (token.type === 'code') {
      const codeToken = token as Tokens.Code;
      const codeId = deterministicId({
        kind: 'code',
        path: filePath ?? '',
        start,
        text: codeToken.text.slice(0, 200),
      });
      const block: RuleCodeBlock =
        codeToken.lang !== undefined && codeToken.lang !== ''
          ? {
              id: codeId,
              code: codeToken.text,
              language: codeToken.lang,
              location: buildLocation(filePath, start, end, lineStarts),
            }
          : {
              id: codeId,
              code: codeToken.text,
              location: buildLocation(filePath, start, end, lineStarts),
            };
      out.push(block);
    } else if (hasChildTokens(token)) {
      walkForCodeBlocks(token.tokens ?? [], start, out, filePath, lineStarts);
    }

    offset = end;
  }
}

function walkForDirectives(
  tokens: readonly Token[],
  baseOffset: number,
  out: RuleDirective[],
  filePath: string | undefined,
  lineStarts: readonly number[],
): void {
  let offset = baseOffset;

  for (const token of tokens) {
    const start = offset;
    const rawLength = typeof token.raw === 'string' ? token.raw.length : 0;
    const end = start + rawLength;

    if (token.type === 'list') {
      collectListDirectives(token as Tokens.List, start, out, filePath, lineStarts);
    } else if (token.type === 'blockquote') {
      const text = extractPlainText((token as Tokens.Blockquote).tokens);
      if (text !== '') {
        out.push({
          id: deterministicId({ kind: 'directive', path: filePath ?? '', start, text }),
          text,
          priority: detectPriority(text),
          location: buildLocation(filePath, start, end, lineStarts),
        });
      }
    } else if (hasChildTokens(token)) {
      walkForDirectives(token.tokens ?? [], start, out, filePath, lineStarts);
    }

    offset = end;
  }
}

function collectListDirectives(
  list: Tokens.List,
  listOffset: number,
  out: RuleDirective[],
  filePath: string | undefined,
  lineStarts: readonly number[],
): void {
  let offset = listOffset;

  for (const item of list.items) {
    const start = offset;
    const itemRawLength = typeof item.raw === 'string' ? item.raw.length : 0;
    const end = start + itemRawLength;

    const text = extractListItemText(item);
    if (text !== '') {
      out.push({
        id: deterministicId({ kind: 'directive', path: filePath ?? '', start, text }),
        text,
        priority: detectPriority(text),
        location: buildLocation(filePath, start, end, lineStarts),
      });
    }

    walkForDirectives(item.tokens, start, out, filePath, lineStarts);

    offset = end;
  }
}

function extractListItemText(item: Tokens.ListItem): string {
  const parts: string[] = [];

  for (const token of item.tokens) {
    if (token.type === 'list') {
      break;
    }

    if (token.type === 'paragraph' || token.type === 'text') {
      parts.push(stripInlineMarkdown((token as Tokens.Paragraph | Tokens.Text).text));
    } else if (token.type === 'codespan') {
      parts.push((token as Tokens.Codespan).text);
    }
  }

  return collapseWhitespace(parts.join(' '));
}

function extractPlainText(tokens: readonly Token[]): string {
  const parts: string[] = [];

  for (const token of tokens) {
    if (token.type === 'text' || token.type === 'paragraph') {
      parts.push(stripInlineMarkdown((token as Tokens.Text | Tokens.Paragraph).text));
    } else if (token.type === 'codespan') {
      parts.push((token as Tokens.Codespan).text);
    } else if (hasChildTokens(token)) {
      parts.push(extractPlainText(token.tokens ?? []));
    }
  }

  return collapseWhitespace(parts.join(' '));
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`+([^`]+)`+/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function detectPriority(text: string): RuleDirectivePriority {
  const upper = text.toUpperCase();

  if (
    /\bMUST NOT\b|\bMUST\b|\bREQUIRED\b|\bSHALL NOT\b|\bSHALL\b|\bDO NOT\b|\bDON'?T\b|\bNEVER\b|\bALWAYS\b|\bIMPORTANT\b/.test(
      upper,
    )
  ) {
    return 'must';
  }

  if (/\bSHOULD NOT\b|\bSHOULD\b|\bRECOMMENDED\b|\bPREFER\b|\bAVOID\b/.test(upper)) {
    return 'should';
  }

  if (/\bMAY\b|\bOPTIONAL\b|\bCAN\b|\bMIGHT\b/.test(upper)) {
    return 'may';
  }

  return 'unknown';
}

function hasChildTokens(token: Token): token is Token & { tokens?: Token[] } {
  return 'tokens' in token && Array.isArray((token as { tokens?: unknown }).tokens);
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
