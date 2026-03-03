import type { FastifyInstance } from 'fastify';
import { PostgresClient } from '../../clients/PostgresClient.js';

export function registerOnCloseHook(fastifyInstance: FastifyInstance) {
  const postgresClient = PostgresClient.getInstance();

  fastifyInstance.addHook('onClose', async () => {
    fastifyInstance.log.info('Server is closing...');
    await postgresClient.client.end();
  });

  fastifyInstance.log.info('Fastify OnClose Hook registered');
}
