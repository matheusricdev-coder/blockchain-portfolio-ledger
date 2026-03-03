import pino from 'pino';
import type { ILogger } from '../../shared/utils/ILogger.js';
import { env } from '../../shared/config/env.js';

function createPinoLogger(bindings?: Record<string, unknown>): ILogger {
  const base = pino({
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    base: { pid: process.pid },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  const instance = bindings ? base.child(bindings) : base;

  return {
    trace: (msg, ctx) => instance.trace(ctx ?? {}, msg),
    debug: (msg, ctx) => instance.debug(ctx ?? {}, msg),
    info: (msg, ctx) => instance.info(ctx ?? {}, msg),
    warn: (msg, ctx) => instance.warn(ctx ?? {}, msg),
    error: (msg, ctx) => instance.error(ctx ?? {}, msg),
    fatal: (msg, ctx) => instance.fatal(ctx ?? {}, msg),
    child: (b) => createPinoLogger(b),
  };
}

export const logger = createPinoLogger();
