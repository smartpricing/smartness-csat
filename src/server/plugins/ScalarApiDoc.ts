import scalar from '@scalar/fastify-api-reference';
import type { FastifyInstance } from 'fastify';

export function registerScalarApiDoc(fastifyInstance: FastifyInstance) {
  fastifyInstance.register(scalar, {
    logLevel: 'error',
    routePrefix: '/api/csat/v1/reference',
  });

  fastifyInstance.log.info('Fastify Scalar API Doc Plugin registered');
}
