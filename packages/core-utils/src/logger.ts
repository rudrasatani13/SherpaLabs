import process from 'node:process';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFormat = 'human' | 'json';

export type LogPrimitive = string | number | boolean | null;

export type LogValue = LogPrimitive | LogValue[] | { readonly [key: string]: LogValue };

export type LogFields = Record<string, LogValue>;

export interface LogWriter {
  stdout(message: string): void;
  stderr(message: string): void;
}

export interface LoggerOptions {
  level?: LogLevel;
  format?: LogFormat;
  ci?: boolean;
  writer?: LogWriter;
  now?: () => Date;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  getLevel(): LogLevel;
  setLevel(level: LogLevel): void;
}

const levelWeights = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const satisfies Record<LogLevel, number>;

const defaultWriter: LogWriter = {
  stdout: (message) => {
    process.stdout.write(message);
  },
  stderr: (message) => {
    process.stderr.write(message);
  },
};

export function createLogger(options: LoggerOptions = {}): Logger {
  let currentLevel = options.level ?? 'info';
  const format = options.format ?? (options.ci === true ? 'json' : 'human');
  const writer = options.writer ?? defaultWriter;
  const now = options.now ?? (() => new Date());

  function write(level: LogLevel, message: string, fields?: LogFields): void {
    if (levelWeights[level] < levelWeights[currentLevel]) {
      return;
    }

    const line =
      format === 'json'
        ? formatJsonLog(level, message, fields, now)
        : formatHumanLog(level, message, fields);

    if (level === 'warn' || level === 'error') {
      writer.stderr(line);
      return;
    }

    writer.stdout(line);
  }

  return {
    debug: (message, fields) => {
      write('debug', message, fields);
    },
    info: (message, fields) => {
      write('info', message, fields);
    },
    warn: (message, fields) => {
      write('warn', message, fields);
    },
    error: (message, fields) => {
      write('error', message, fields);
    },
    getLevel: () => currentLevel,
    setLevel: (level) => {
      currentLevel = level;
    },
  };
}

function formatHumanLog(level: LogLevel, message: string, fields?: LogFields): string {
  const prefix = level.toUpperCase();
  const fieldText = hasFields(fields) ? ` ${JSON.stringify(fields)}` : '';

  return `${prefix} ${message}${fieldText}\n`;
}

function formatJsonLog(
  level: LogLevel,
  message: string,
  fields: LogFields | undefined,
  now: () => Date,
): string {
  const entry: {
    timestamp: string;
    level: LogLevel;
    message: string;
    fields?: LogFields;
  } = {
    timestamp: now().toISOString(),
    level,
    message,
  };

  if (hasFields(fields)) {
    entry.fields = fields;
  }

  return `${JSON.stringify(entry)}\n`;
}

function hasFields(fields: LogFields | undefined): fields is LogFields {
  return fields != null && Object.keys(fields).length > 0;
}
