import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { GetFeaturesUsecase } from '../../usecases/interactions/GetFeaturesUsecase.js';
import { GetUserInteractionsUsecase } from '../../usecases/interactions/GetUserInteractionsUsecase.js';
import { IncrementInteractionUsecase } from '../../usecases/interactions/IncrementInteractionUsecase.js';
import { RejectFeatureUsecase } from '../../usecases/interactions/RejectFeatureUsecase.js';
import {
  GetFeatureInteractionsParamsSchema,
  GetFeatureInteractionsQuerySchema,
  GetFeatureInteractionsResponseSchema,
  GetFeaturesQuerySchema,
  GetFeaturesResponseSchema,
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
        description: 'Increment interaction count for a user on a specific feature',
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
        description: 'Reject a feedback prompt for a user on a specific feature',
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
        description: 'Get all feature interactions for a user within a product',
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

  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/features',
    {
      schema: {
        description: 'Get all features, optionally filtered by product key(s)',
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

  fastifyInstance.log.info('Fastify Interactions Router registered');
}
