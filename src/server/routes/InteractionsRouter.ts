import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { GetUserInteractionsUsecase } from '../../usecases/interactions/GetUserInteractionsUsecase.js';
import { IncrementInteractionUsecase } from '../../usecases/interactions/IncrementInteractionUsecase.js';
import { RejectFeatureUsecase } from '../../usecases/interactions/RejectFeatureUsecase.js';
import {
  GetFeatureInteractionsParamsSchema,
  GetFeatureInteractionsQuerySchema,
  GetFeatureInteractionsResponseSchema,
  IncrementInteractionBodySchema,
  IncrementInteractionResponseSchema,
  ProductFeatureParamsSchema,
  RejectInteractionBodySchema,
  RejectInteractionResponseSchema,
} from '../schemas/InteractionsSchemas.js';

export async function getInteractionsRouter(fastifyInstance: FastifyInstance) {
  fastifyInstance.withTypeProvider<ZodTypeProvider>().post(
    '/products/:product_key/features/:feature_key/increment',
    {
      schema: {
        summary: 'Increment interaction',
        description: 'Records one interaction for a user on a feature. Returns the updated counters and whether the CSAT prompt should now be shown to the user.',
        tags: ['interactions'],
        params: ProductFeatureParamsSchema,
        body: IncrementInteractionBodySchema,
        response: {
          200: IncrementInteractionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new IncrementInteractionUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        featureKey: request.params.feature_key,
        userEmail: request.body.user_email,
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.withTypeProvider<ZodTypeProvider>().post(
    '/products/:product_key/features/:feature_key/reject',
    {
      schema: {
        summary: 'Reject feedback prompt',
        description: 'Marks that a user dismissed the CSAT prompt for a feature. Resets the interaction counter and increments the rejection count. Once the rejection threshold is reached, the prompt is permanently disabled for that user.',
        tags: ['interactions'],
        params: ProductFeatureParamsSchema,
        body: RejectInteractionBodySchema,
        response: {
          200: RejectInteractionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new RejectFeatureUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        featureKey: request.params.feature_key,
        userEmail: request.body.user_email,
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/products/:product_key/feature-interactions',
    {
      schema: {
        summary: 'Get user feature interactions',
        description: 'Returns the interaction state for every feature in a product for a specific user — counters, thresholds, and whether each feature should currently prompt for CSAT feedback.',
        tags: ['interactions'],
        params: GetFeatureInteractionsParamsSchema,
        querystring: GetFeatureInteractionsQuerySchema,
        response: {
          200: GetFeatureInteractionsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new GetUserInteractionsUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        userEmail: request.query.user_email,
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.log.info('Fastify Interactions Router registered');
}
