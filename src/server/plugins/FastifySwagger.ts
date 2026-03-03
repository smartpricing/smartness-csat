import swagger from '@fastify/swagger';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export function registerFastifySwagger(fastifyInstance: FastifyInstance) {
  fastifyInstance.register(swagger, {
    logLevel: 'error',
    openapi: {
      info: {
        title: 'CSAT Feedback API',
        description: 'API documentation for CSAT feedback collection, feature interactions, and user satisfaction tracking',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    transform: jsonSchemaTransform,
  });

  fastifyInstance.get('/openapi/api/csat/v1/openapi.json', async (_, reply) => {
    reply.type('application/json');
    return fastifyInstance.swagger();
  });

  fastifyInstance.log.info('Fastify Swagger Plugin registered');
}
