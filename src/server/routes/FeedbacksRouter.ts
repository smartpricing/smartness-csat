import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { SaveFeedbackUsecase } from '../../usecases/feedbacks/SaveFeedbackUsecase.js';
import {
  SaveFeedbackBodySchema,
  SaveFeedbackParamsSchema,
  SaveFeedbackResponseSchema,
} from '../schemas/FeedbacksSchemas.js';

export async function getFeedbacksRouter(fastifyInstance: FastifyInstance) {
  fastifyInstance.withTypeProvider<ZodTypeProvider>().post(
    '/products/:product_key/features/:feature_key/feedbacks',
    {
      schema: {
        summary: 'Submit feedback',
        description: 'Saves a user\'s CSAT feedback (rating + optional comment) for a specific product feature. The source field indicates whether the feedback was prompted by the system or submitted voluntarily.',
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

  fastifyInstance.log.info('Fastify Feedbacks Router registered');
}
