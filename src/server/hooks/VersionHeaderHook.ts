import type { FastifyInstance } from 'fastify';
import { getConfig } from '../../config.js';

export function registerVersionHeaderHook(fastifyInstance: FastifyInstance) {
  const { version } = getConfig();

  fastifyInstance.addHook('onSend', async (_, reply) => {
    reply.header('version', version);
  });

  fastifyInstance.log.info('Fastify Version Header Hook registered');
}
