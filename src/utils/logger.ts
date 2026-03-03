// biome-ignore-all lint: ignore all errors
import type { FastifyBaseLogger } from 'fastify';
import type { Bindings, ChildLoggerOptions } from 'pino';

let _logger: FastifyBaseLogger;

export function initLogger(loggerInstance: FastifyBaseLogger) {
  if (_logger != undefined) {
    throw new Error('Logger already initialized');
  }

  _logger = loggerInstance;
}

export const logger: Omit<FastifyBaseLogger, 'level'> = {
  child(bindings: Bindings, options?: ChildLoggerOptions): FastifyBaseLogger {
    try {
      return _logger.child(bindings, options);
    } catch {
      console.warn(`${new Date()} #> logger not initialized`);
      return _logger;
    }
  },

  fatal(msg: any, ...args: any[]) {
    try {
      _logger.fatal(msg, ...args);
    } catch {
      console.warn(`${new Date()} #> logger not initialized`);
    }
  },

  error(msg: any, ...args: any[]) {
    try {
      _logger.error(msg, ...args);
    } catch {
      console.warn(`${new Date()} #> logger not initialized`);
    }
  },

  warn(msg: any, ...args: any[]) {
    try {
      _logger.warn(msg, ...args);
    } catch {
      console.warn(`${new Date()} #> logger not initialized`);
    }
  },

  info(msg: any, ...args: any[]) {
    try {
      _logger.info(msg, ...args);
    } catch {
      console.warn(`${new Date()} #> logger not initialized`);
    }
  },

  debug(msg: any, ...args: any[]) {
    try {
      _logger.debug(msg, ...args);
    } catch {
      console.warn(`${new Date()} #> logger not initialized`);
    }
  },

  trace(msg: any, ...args: any[]) {
    try {
      _logger.trace(msg, ...args);
    } catch {
      console.warn(`${new Date()} #> logger not initialized`);
    }
  },

  silent(_msg: any, ..._args: any[]) {},
} as const;
