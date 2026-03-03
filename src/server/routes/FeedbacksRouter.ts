import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { GetFeedbackAnalyticsUsecase } from '../../usecases/feedbacks/GetFeedbackAnalyticsUsecase.js';
import { SaveFeedbackUsecase } from '../../usecases/feedbacks/SaveFeedbackUsecase.js';
import {
  GetFeedbackAnalyticsQuerySchema,
  GetFeedbackAnalyticsResponseSchema,
  SaveFeedbackBodySchema,
  SaveFeedbackParamsSchema,
  SaveFeedbackResponseSchema,
} from '../schemas/FeedbacksSchemas.js';

export async function getFeedbacksRouter(fastifyInstance: FastifyInstance) {
  fastifyInstance.withTypeProvider<ZodTypeProvider>().post(
    '/products/:product_key/features/:feature_key/feedbacks',
    {
      schema: {
        description: 'Save user feedback for a specific feature',
        tags: ['feedbacks'],
        params: SaveFeedbackParamsSchema,
        body: SaveFeedbackBodySchema,
        response: {
          201: SaveFeedbackResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new SaveFeedbackUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        featureKey: request.params.feature_key,
        userEmail: request.body.user_email,
        rating: request.body.rating,
        comment: request.body.comment,
        source: request.body.source,
        userAgent: request.body.user_agent,
      });

      return reply.code(201).send(result);
    },
  );

  fastifyInstance.withTypeProvider<ZodTypeProvider>().get(
    '/feedbacks/analytics',
    {
      schema: {
        description: 'Get quarterly feedback analytics by product and/or feature',
        tags: ['feedbacks'],
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

  fastifyInstance.log.info('Fastify Feedbacks Router registered');
}
