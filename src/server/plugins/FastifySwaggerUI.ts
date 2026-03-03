import swaggerUI from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export function registerFastifySwaggerUI(fastifyInstance: FastifyInstance) {
  fastifyInstance.register(swaggerUI, {
    logLevel: 'error',
    routePrefix: '/openapi/api/csat/v1',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
      persistAuthorization: true,
    },
  });

  fastifyInstance.log.info('Fastify Swagger UI Plugin registered');
}
