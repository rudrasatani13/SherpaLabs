import { readFile, stat } from 'node:fs/promises';
import type { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';

export const DEFAULT_MAX_FILE_READ_BYTES = 1024 * 1024;

export type SafeFileEncoding = 'utf8' | 'utf16le' | 'utf16be';

export type SafeFileReadErrorCode =
  | 'binary_file'
  | 'invalid_options'
  | 'not_file'
  | 'not_found'
  | 'read_error'
  | 'too_large';

export interface SafeFileReadOptions {
  maxBytes?: number;
}

export interface SafeFileReadError {
  code: SafeFileReadErrorCode;
  message: string;
  path: string;
  cause?: unknown;
}

export interface SafeFileReadSuccess {
  ok: true;
  path: string;
  content: string;
  encoding: SafeFileEncoding;
  sizeBytes: number;
}

export interface SafeFileReadFailure {
  ok: false;
  error: SafeFileReadError;
}

export type SafeFileReadResult = SafeFileReadSuccess | SafeFileReadFailure;

interface EncodingDetection {
  encoding: SafeFileEncoding;
  offset: number;
}

interface DecodeSuccess {
  ok: true;
  content: string;
  encoding: SafeFileEncoding;
}

interface DecodeFailure {
  ok: false;
}

type DecodeResult = DecodeSuccess | DecodeFailure;

const binarySampleBytes = 8 * 1024;

export async function safeReadFile(
  filePath: string,
  options: SafeFileReadOptions = {},
): Promise<SafeFileReadResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_FILE_READ_BYTES;

  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    return failure('invalid_options', filePath, 'maxBytes must be a non-negative safe integer.');
  }

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return failure('not_file', filePath, 'Path exists but is not a regular file.');
    }

    if (fileStat.size > maxBytes) {
      return failure(
        'too_large',
        filePath,
        `File is ${fileStat.size} bytes; limit is ${maxBytes} bytes.`,
      );
    }

    const buffer = await readFile(filePath);

    if (buffer.byteLength > maxBytes) {
      return failure(
        'too_large',
        filePath,
        `File is ${buffer.byteLength} bytes; limit is ${maxBytes} bytes.`,
      );
    }

    const decoded = decodeText(buffer);

    if (!decoded.ok) {
      return failure(
        'binary_file',
        filePath,
        'File appears to be binary or uses an unsupported encoding.',
      );
    }

    return {
      ok: true,
      path: filePath,
      content: decoded.content,
      encoding: decoded.encoding,
      sizeBytes: buffer.byteLength,
    };
  } catch (error) {
    if (getErrorCode(error) === 'ENOENT') {
      return failure('not_found', filePath, 'File does not exist.', error);
    }

    return failure('read_error', filePath, 'Unable to read file.', error);
  }
}

function decodeText(buffer: Buffer): DecodeResult {
  if (buffer.byteLength === 0) {
    return { ok: true, content: '', encoding: 'utf8' };
  }

  const detection = detectEncoding(buffer);
  const body = buffer.subarray(detection.offset);

  if (detection.encoding === 'utf8') {
    if (isLikelyBinaryBytes(body)) {
      return { ok: false };
    }

    try {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(body);

      if (hasSuspiciousControlCharacters(content)) {
        return { ok: false };
      }

      return { ok: true, content, encoding: detection.encoding };
    } catch (_error) {
      return { ok: false };
    }
  }

  if (body.byteLength % 2 !== 0) {
    return { ok: false };
  }

  try {
    const decoderEncoding = detection.encoding === 'utf16le' ? 'utf-16le' : 'utf-16be';
    const content = new TextDecoder(decoderEncoding, { fatal: true }).decode(body);

    if (hasSuspiciousControlCharacters(content)) {
      return { ok: false };
    }

    return { ok: true, content, encoding: detection.encoding };
  } catch (_error) {
    return { ok: false };
  }
}

function detectEncoding(buffer: Buffer): EncodingDetection {
  if (startsWithBytes(buffer, [0xef, 0xbb, 0xbf])) {
    return { encoding: 'utf8', offset: 3 };
  }

  if (startsWithBytes(buffer, [0xff, 0xfe])) {
    return { encoding: 'utf16le', offset: 2 };
  }

  if (startsWithBytes(buffer, [0xfe, 0xff])) {
    return { encoding: 'utf16be', offset: 2 };
  }

  const utf16Encoding = detectLikelyUtf16(buffer);

  if (utf16Encoding != null) {
    return { encoding: utf16Encoding, offset: 0 };
  }

  return { encoding: 'utf8', offset: 0 };
}

function detectLikelyUtf16(buffer: Buffer): SafeFileEncoding | undefined {
  if (buffer.byteLength < 8) {
    return undefined;
  }

  const sample = buffer.subarray(0, Math.min(buffer.byteLength, binarySampleBytes));
  let pairCount = 0;
  let evenNulls = 0;
  let oddNulls = 0;

  for (let index = 0; index + 1 < sample.byteLength; index += 2) {
    const first = sample[index];
    const second = sample[index + 1];

    if (first == null || second == null) {
      continue;
    }

    pairCount += 1;

    if (first === 0) {
      evenNulls += 1;
    }

    if (second === 0) {
      oddNulls += 1;
    }
  }

  if (pairCount < 4) {
    return undefined;
  }

  const evenRatio = evenNulls / pairCount;
  const oddRatio = oddNulls / pairCount;

  if (oddRatio > 0.6 && evenRatio < 0.2) {
    return 'utf16le';
  }

  if (evenRatio > 0.6 && oddRatio < 0.2) {
    return 'utf16be';
  }

  return undefined;
}

function startsWithBytes(buffer: Buffer, bytes: readonly number[]): boolean {
  if (buffer.byteLength < bytes.length) {
    return false;
  }

  return bytes.every((byte, index) => buffer[index] === byte);
}

function isLikelyBinaryBytes(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.byteLength, binarySampleBytes));

  if (sample.byteLength === 0) {
    return false;
  }

  let suspiciousControls = 0;

  for (const byte of sample) {
    if (byte === 0) {
      return true;
    }

    if (isSuspiciousControlCode(byte)) {
      suspiciousControls += 1;
    }
  }

  return suspiciousControls / sample.byteLength > 0.1;
}

function hasSuspiciousControlCharacters(value: string): boolean {
  if (value.length === 0) {
    return false;
  }

  let suspiciousControls = 0;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code === 0) {
      return true;
    }

    if (isSuspiciousControlCode(code)) {
      suspiciousControls += 1;
    }
  }

  return suspiciousControls / value.length > 0.05;
}

function isSuspiciousControlCode(code: number): boolean {
  return code < 8 || (code > 13 && code < 32);
}

function failure(
  code: SafeFileReadErrorCode,
  filePath: string,
  message: string,
  cause?: unknown,
): SafeFileReadFailure {
  const error: SafeFileReadError = {
    code,
    message,
    path: filePath,
  };

  if (cause !== undefined) {
    error.cause = cause;
  }

  return { ok: false, error };
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error == null || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === 'string' ? code : undefined;
}
