import type { FastifyInstance } from 'fastify';

export function registerRequestIdHook(fastifyInstance: FastifyInstance) {
  fastifyInstance.addHook('onSend', async (request, reply) => {
    const requestId = request.id;

    reply.header('request-id', requestId);
  });

  fastifyInstance.log.info('Fastify Request Id Hook registered');
}
