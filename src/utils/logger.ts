import { requestIdOf } from './context';

type Level = 'debug' | 'info' | 'warn' | 'error';

const write = (level: Level, message: string, meta?: Record<string, unknown>) => {
  const entry = {
    level,
    message,
    requestId: requestIdOf(),
    time: new Date().toISOString(),
    ...(meta ?? {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

/**
 * Structured JSON logs with the request id attached, so a stack trace can be
 * traced back to the request that produced it without grepping timestamps.
 */
export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'test') write('debug', message, meta);
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'test') write('info', message, meta);
  },
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};
