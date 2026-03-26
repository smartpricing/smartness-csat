import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { SaveFeedbackUsecase } from '../../usecases/feedbacks/SaveFeedbackUsecase.js';
import { SyncFeedbacksUsecase } from '../../usecases/feedbacks/SyncFeedbacksUsecase.js';
import { TranslateFeedbacksUsecase } from '../../usecases/feedbacks/TranslateFeedbacksUsecase.js';
import { UpdateFeedbackNotesUsecase } from '../../usecases/feedbacks/UpdateFeedbackNotesUsecase.js';
import {
  SaveFeedbackBodySchema,
  SaveFeedbackParamsSchema,
  SaveFeedbackResponseSchema,
  SyncFeedbacksResponseSchema,
  TranslateFeedbacksResponseSchema,
  UpdateFeedbackNotesBodySchema,
  UpdateFeedbackNotesParamsSchema,
  UpdateFeedbackNotesResponseSchema,
} from '../schemas/FeedbacksSchemas.js';

export async function getFeedbacksRouter(fastifyInstance: FastifyInstance) {
  fastifyInstance.withTypeProvider<ZodTypeProvider>().post(
    '/products/:product_key/features/:feature_key/feedbacks',
    {
      schema: {
        summary: 'Submit feedback',
        description:
          "Saves a user's CSAT feedback (rating + optional comment) for a specific product feature. The source field indicates whether the feedback was prompted by the system or submitted voluntarily.",
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

  fastifyInstance.withTypeProvider<ZodTypeProvider>().post(
    '/feedbacks/translate',
    {
      schema: {
        summary: 'Translate pending feedbacks',
        description:
          'Translates a batch of PENDING feedbacks to English using LibreTranslate and advances them to TRANSLATED state. Designed to be called by a Kubernetes CronJob.',
        tags: ['feedbacks'],
        response: {
          200: TranslateFeedbacksResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new TranslateFeedbacksUsecase(postgresClient);

      const result = await usecase.execute();

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.withTypeProvider<ZodTypeProvider>().post(
    '/feedbacks/sync',
    {
      schema: {
        summary: 'Sync translated feedbacks to Zapier',
        description:
          'Syncs a batch of TRANSLATED feedbacks to the configured Zapier webhook and advances them to DONE state. Designed to be called by a Kubernetes CronJob.',
        tags: ['feedbacks'],
        response: {
          200: SyncFeedbacksResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new SyncFeedbacksUsecase(postgresClient);

      const result = await usecase.execute();

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.withTypeProvider<ZodTypeProvider>().patch(
    '/feedbacks/:feedback_id/notes',
    {
      schema: {
        summary: 'Update feedback notes',
        description: 'Updates the notes field on a feedback. This is free text intended for PO annotations.',
        tags: ['feedbacks'],
        params: UpdateFeedbackNotesParamsSchema,
        body: UpdateFeedbackNotesBodySchema,
        response: {
          200: UpdateFeedbackNotesResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new UpdateFeedbackNotesUsecase(postgresClient);

      const result = await usecase.execute({
        feedbackId: request.params.feedback_id,
        notes: request.body.notes,
        updatedBy: request.body.updated_by,
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.log.info('Fastify Feedbacks Router registered');
}
