import { randomUUID } from 'node:crypto';
import fastify, { type FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { Config } from '../config.js';
import { initLogger } from '../utils/logger.js';
import { errorHandler } from './errorHandler.js';
import { registerHooks } from './hooks/index.js';
import { registerPlugins } from './plugins/index.js';
import { registerRoutes } from './routes/index.js';

export async function startServer(config: Config): Promise<{
  fastifyInstance: FastifyInstance;
}> {
  const fastifyInstance = fastify({
    logger: {
      level: config.log.level || 'info',
      serializers: {
        res(res) {
          return {
            statusCode: res.statusCode,
            method: res.request?.method,
            url: res.request?.url,
          };
        },
      },
      formatters: {
        level(label) {
          return { level: label.toLowerCase() };
        },
      },
    },
    genReqId(req) {
      const requestId = Array.isArray(req.headers['request-id'])
        ? req.headers['request-id'][0]
        : req.headers['request-id'];

      return requestId || randomUUID();
    },
  }).withTypeProvider<ZodTypeProvider>();

  initLogger(fastifyInstance.log);

  registerPlugins(fastifyInstance);
  registerHooks(fastifyInstance);
  registerRoutes(fastifyInstance);

  fastifyInstance.setErrorHandler(errorHandler);

  await fastifyInstance.listen({
    host: config.server.host,
    port: config.server.port,
  });

  fastifyInstance.log.info(`Fastify is running on port ${config.server.port}!`);
  fastifyInstance.log.info(`Timezone: ${process.env['TZ'] || Intl.DateTimeFormat().resolvedOptions().timeZone} (offset: ${new Date().getTimezoneOffset()})`);

  return {
    fastifyInstance,
  };
}
