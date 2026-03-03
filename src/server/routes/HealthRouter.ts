import type { FastifyInstance } from 'fastify';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { HealthReadyUsecase } from '../../usecases/health/Ready.js';

export async function getHealthRouter(fastifyInstance: FastifyInstance) {
  fastifyInstance.get('/ready', {}, async (_, reply) => {
    const postgresClient = PostgresClient.getInstance();
    const usecase = new HealthReadyUsecase(postgresClient);
    await usecase.execute();
    return reply.code(200).send();
  });

  fastifyInstance.get('/check', {}, async (_, reply) => {
    return reply.code(200).send();
  });

  fastifyInstance.log.info('Fastify Health Router registered');
}
