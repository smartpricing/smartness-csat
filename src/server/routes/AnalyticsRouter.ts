import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { GetFeatureInteractionAnalyticsUsecase } from '../../usecases/analytics/GetFeatureInteractionAnalyticsUsecase.js';
import { GetFeedbackAnalyticsUsecase } from '../../usecases/feedbacks/GetFeedbackAnalyticsUsecase.js';
import {
  GetFeatureInteractionAnalyticsParamsSchema,
  GetFeatureInteractionAnalyticsResponseSchema,
} from '../schemas/AnalyticsSchemas.js';
import {
  GetFeedbackAnalyticsQuerySchema,
  GetFeedbackAnalyticsResponseSchema,
} from '../schemas/FeedbacksSchemas.js';

export async function getAnalyticsRouter(fastifyInstance: FastifyInstance) {
  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/feedbacks',
    {
      schema: {
        summary: 'Feedback analytics',
        description: 'Returns quarterly aggregated feedback analytics (count, average rating, median rating) broken down by feature. Filter by product key and/or feature key. Useful for trend analysis and internal reporting.',
        tags: ['analytics'],
        querystring: GetFeedbackAnalyticsQuerySchema,
        response: {
          200: GetFeedbackAnalyticsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new GetFeedbackAnalyticsUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.query.product_key,
        featureKey: request.query.feature_key,
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/interactions/products/:product_key/features/:feature_key',
    {
      schema: {
        summary: 'Feature interaction analytics',
        description: 'Returns a summary and per-user breakdown of interaction data for a specific feature. Users are sorted by total_interaction_count descending. The summary includes total users, average and max interactions, how many are currently pending a CSAT prompt, and how many have exhausted their rejection threshold.',
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

  fastifyInstance.log.info('Fastify Analytics Router registered');
}
