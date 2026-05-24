import { InvalidSseEventError } from './errors.js';

export interface SseEvent {
  readonly event: string;
  readonly data: string;
  readonly id?: string;
  readonly retry?: number;
}

export class SseParser {
  #lineBuffer = '';
  #dataLines: string[] = [];
  #eventName = '';
  #eventId: string | undefined;
  #retryMs: number | undefined;
  #skipNextLf = false;

  push(chunk: string): readonly SseEvent[] {
    const events: SseEvent[] = [];

    for (const char of chunk) {
      if (this.#skipNextLf) {
        this.#skipNextLf = false;

        if (char === '\n') {
          continue;
        }
      }

      if (char === '\n') {
        this.#processLine(this.#lineBuffer, events);
        this.#lineBuffer = '';
        continue;
      }

      if (char === '\r') {
        this.#processLine(this.#lineBuffer, events);
        this.#lineBuffer = '';
        this.#skipNextLf = true;
        continue;
      }

      this.#lineBuffer += char;
    }

    return events;
  }

  end(): readonly SseEvent[] {
    const events: SseEvent[] = [];

    if (this.#lineBuffer !== '') {
      this.#processLine(this.#lineBuffer, events);
      this.#lineBuffer = '';
    }

    this.#dispatch(events);

    return events;
  }

  #processLine(line: string, events: SseEvent[]): void {
    if (line === '') {
      this.#dispatch(events);
      return;
    }

    if (line.startsWith(':')) {
      return;
    }

    const colonIndex = line.indexOf(':');
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    const rawValue = colonIndex === -1 ? '' : line.slice(colonIndex + 1);
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;

    switch (field) {
      case 'data':
        this.#dataLines.push(value);
        return;
      case 'event':
        this.#eventName = value;
        return;
      case 'id':
        if (!value.includes('\0')) {
          this.#eventId = value;
        }
        return;
      case 'retry':
        this.#retryMs = parseRetryField(value);
        return;
      default:
        return;
    }
  }

  #dispatch(events: SseEvent[]): void {
    if (this.#dataLines.length === 0) {
      this.#resetEvent();
      return;
    }

    const event: {
      event: string;
      data: string;
      id?: string;
      retry?: number;
    } = {
      event: this.#eventName === '' ? 'message' : this.#eventName,
      data: this.#dataLines.join('\n'),
    };

    if (this.#eventId != null) {
      event.id = this.#eventId;
    }

    if (this.#retryMs != null) {
      event.retry = this.#retryMs;
    }

    events.push(event);
    this.#resetEvent();
  }

  #resetEvent(): void {
    this.#dataLines = [];
    this.#eventName = '';
    this.#eventId = undefined;
    this.#retryMs = undefined;
  }
}

function parseRetryField(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new InvalidSseEventError('retry field must be a non-negative integer', {
      event: 'retry',
      data: value,
    });
  }

  return Number(value);
}
