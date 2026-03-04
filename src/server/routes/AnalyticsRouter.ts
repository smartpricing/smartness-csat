import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { GetFeedbacksListUsecase } from '../../usecases/analytics/GetFeedbacksListUsecase.js';
import { GetFeedbackSummaryAnalyticsUsecase } from '../../usecases/analytics/GetFeedbackSummaryAnalyticsUsecase.js';
import { GetFeatureInteractionAnalyticsUsecase } from '../../usecases/analytics/GetFeatureInteractionAnalyticsUsecase.js';
import { GetUserInteractionsListUsecase } from '../../usecases/analytics/GetUserInteractionsListUsecase.js';
import {
  GetFeatureInteractionAnalyticsParamsSchema,
  GetFeatureInteractionAnalyticsResponseSchema,
  GetFeedbacksListResponseSchema,
  GetFeedbackSummaryAnalyticsResponseSchema,
  GetUserInteractionsListResponseSchema,
  PaginatedListQuerySchema,
} from '../schemas/AnalyticsSchemas.js';

export async function getAnalyticsRouter(fastifyInstance: FastifyInstance) {
  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/products/:product_key/features/:feature_key/interactions',
    {
      schema: {
        summary: 'Interaction summary analytics',
        description: 'Returns a summary of interaction data for a specific feature. The summary includes total users, average and max interactions, how many are currently pending a CSAT prompt, and how many have exhausted their rejection threshold.',
        tags: ['analytics'],
        params: GetFeatureInteractionAnalyticsParamsSchema,
        response: {
          200: GetFeatureInteractionAnalyticsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new GetFeatureInteractionAnalyticsUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        featureKey: request.params.feature_key,
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/products/:product_key/features/:feature_key/interactions/users',
    {
      schema: {
        summary: 'List user interactions (paginated)',
        description: 'Returns a paginated list of users and their interaction data for a specific feature. Ordered by created_at descending. Use cursor pagination for efficient navigation.',
        tags: ['analytics'],
        params: GetFeatureInteractionAnalyticsParamsSchema,
        querystring: PaginatedListQuerySchema,
        response: {
          200: GetUserInteractionsListResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new GetUserInteractionsListUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        featureKey: request.params.feature_key,
        limit: request.query.limit,
        cursor: request.query.cursor,
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/products/:product_key/features/:feature_key/feedbacks',
    {
      schema: {
        summary: 'Feedback summary analytics',
        description: 'Returns a summary of feedback data for a specific feature. Includes total feedbacks, average/median rating, rating distribution, quarterly breakdown, and comparison with last quarter.',
        tags: ['analytics'],
        params: GetFeatureInteractionAnalyticsParamsSchema,
        response: {
          200: GetFeedbackSummaryAnalyticsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new GetFeedbackSummaryAnalyticsUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        featureKey: request.params.feature_key,
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/products/:product_key/features/:feature_key/feedbacks/users',
    {
      schema: {
        summary: 'List feedbacks (paginated)',
        description: 'Returns a paginated list of individual feedback submissions for a specific feature. Ordered by created_at descending. Use cursor pagination for efficient navigation.',
        tags: ['analytics'],
        params: GetFeatureInteractionAnalyticsParamsSchema,
        querystring: PaginatedListQuerySchema,
        response: {
          200: GetFeedbacksListResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new GetFeedbacksListUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        featureKey: request.params.feature_key,
        limit: request.query.limit,
        cursor: request.query.cursor,
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.log.info('Fastify Analytics Router registered');
}
