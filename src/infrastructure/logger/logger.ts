import pino from 'pino';
import type { ILogger } from '../../shared/utils/ILogger.js';
import { env } from '../../shared/config/env.js';

function createPinoLogger(bindings?: Record<string, unknown>): ILogger {
  const pinoOptions: pino.LoggerOptions = {
    level: env.LOG_LEVEL,
    base: { pid: process.pid },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  };

  const base = pino(pinoOptions);

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
