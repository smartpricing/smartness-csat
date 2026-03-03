import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { GetProductsUsecase } from '../../usecases/products/GetProductsUsecase.js';
import { GetProductsResponseSchema } from '../schemas/ProductsSchemas.js';

export async function getProductsRouter(fastifyInstance: FastifyInstance) {
  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/products',
    {
      schema: {
        summary: 'List products',
        description: 'Returns all products registered in the CSAT system. Products are the top-level grouping for features and feedback.',
        tags: ['products'],
        response: {
          200: GetProductsResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new GetProductsUsecase(postgresClient);

      const result = await usecase.execute();

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.log.info('Fastify Products Router registered');
}
