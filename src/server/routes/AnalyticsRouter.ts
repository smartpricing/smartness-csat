import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { FeedbackQuartersAnalyticsUsecase } from '../../usecases/analytics/FeedbackQuartersAnalyticsUsecase.js';
import { FeedbackSummaryAnalyticsUsecase } from '../../usecases/analytics/FeedbackSummaryAnalyticsUsecase.js';
import { FeedbackUsersAnalyticsUsecase } from '../../usecases/analytics/FeedbackUsersAnalyticsUsecase.js';
import { InteractionSummaryAnalyticsUsecase } from '../../usecases/analytics/InteractionSummaryAnalyticsUsecase.js';
import { InteractionUsersAnalyticsUsecase } from '../../usecases/analytics/InteractionUsersAnalyticsUsecase.js';
import {
  GetFeatureInteractionAnalyticsParamsSchema,
  GetFeatureInteractionAnalyticsResponseSchema,
  GetFeedbacksListResponseSchema,
  GetFeedbackSummaryAnalyticsResponseSchema,
  GetFeedbackTimeSeriesResponseSchema,
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
      const usecase = new InteractionSummaryAnalyticsUsecase(postgresClient);

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
      const usecase = new InteractionUsersAnalyticsUsecase(postgresClient);

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
      const usecase = new FeedbackSummaryAnalyticsUsecase(postgresClient);

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
      const usecase = new FeedbackUsersAnalyticsUsecase(postgresClient);

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
    '/products/:product_key/features/:feature_key/feedbacks/timeseries',
    {
      schema: {
        summary: 'Feedback time series analytics',
        description: 'Returns monthly and quarterly breakdown of feedback analytics for a specific feature. Includes feedback count, average rating, and median rating for each time period.',
        tags: ['analytics'],
        params: GetFeatureInteractionAnalyticsParamsSchema,
        response: {
          200: GetFeedbackTimeSeriesResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new FeedbackQuartersAnalyticsUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        featureKey: request.params.feature_key,
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.log.info('Fastify Analytics Router registered');
}
