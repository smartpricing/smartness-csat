import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostgresClient } from '../../clients/PostgresClient.js';
import { CreateFeatureUsecase } from '../../usecases/interactions/CreateFeatureUsecase.js';
import { GetFeaturesUsecase } from '../../usecases/interactions/GetFeaturesUsecase.js';
import { UpdateFeatureUsecase } from '../../usecases/interactions/UpdateFeatureUsecase.js';
import {
  CreateFeatureBodySchema,
  CreateFeatureParamsSchema,
  CreateFeatureResponseSchema,
  GetFeaturesQuerySchema,
  GetFeaturesResponseSchema,
  UpdateFeatureBodySchema,
  UpdateFeatureParamsSchema,
  UpdateFeatureResponseSchema,
} from '../schemas/InteractionsSchemas.js';

export async function getFeaturesRouter(fastifyInstance: FastifyInstance) {
  const router = fastifyInstance.withTypeProvider<ZodTypeProvider>();

  router.get(
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

  router.post(
    '/products/:product_key/features',
    {
      schema: {
        summary: 'Create a feature',
        description: 'Creates a new product feature with configurable interaction and rejection thresholds. The feature display name is automatically derived from the feature key by replacing - _ . + with spaces.',
        tags: ['features'],
        params: CreateFeatureParamsSchema,
        body: CreateFeatureBodySchema,
        response: {
          201: CreateFeatureResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new CreateFeatureUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        featureKey: request.body.feature_key,
        ...(request.body.description !== undefined ? { description: request.body.description } : {}),
        interactionThreshold: request.body.interaction_threshold,
        rejectionThreshold: request.body.rejection_threshold,
      });

      return reply.code(201).send(result);
    },
  );

  router.patch(
    '/products/:product_key/features/:feature_key',
    {
      schema: {
        summary: 'Update a feature',
        description: 'Updates the name and/or description of an existing feature. Pass null to clear a field.',
        tags: ['features'],
        params: UpdateFeatureParamsSchema,
        body: UpdateFeatureBodySchema,
        response: {
          200: UpdateFeatureResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const postgresClient = PostgresClient.getInstance();
      const usecase = new UpdateFeatureUsecase(postgresClient);

      const result = await usecase.execute({
        productKey: request.params.product_key,
        featureKey: request.params.feature_key,
        ...(request.body.name !== undefined ? { name: request.body.name } : {}),
        ...(request.body.description !== undefined ? { description: request.body.description } : {}),
      });

      return reply.code(200).send(result);
    },
  );

  fastifyInstance.log.info('Fastify Features Router registered');
}
