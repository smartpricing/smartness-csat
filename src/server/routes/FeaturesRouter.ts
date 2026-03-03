import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { GetFeaturesUsecase } from '../../usecases/interactions/GetFeaturesUsecase.js';
import { GetFeaturesQuerySchema, GetFeaturesResponseSchema } from '../schemas/InteractionsSchemas.js';

export async function getFeaturesRouter(fastifyInstance: FastifyInstance) {
  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/features',
    {
      schema: {
        summary: 'List features',
        description: 'Returns all product features registered in the system. Optionally filter by one or more product keys. Each feature includes its interaction and rejection thresholds.',
        tags: ['features'],
        querystring: GetFeaturesQuerySchema,
        response: {
          200: GetFeaturesResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new GetFeaturesUsecase(postgresClient);

      const productKeys = request.query.product_key
        ? Array.isArray(request.query.product_key)
          ? request.query.product_key
          : [request.query.product_key]
        : undefined;

      const result = await usecase.execute({ productKeys });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.log.info('Fastify Features Router registered');
}
