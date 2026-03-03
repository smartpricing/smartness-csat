import type { FastifyInstance } from 'fastify';
import { getFeedbacksRouter } from './FeedbacksRouter.js';
import { getHealthRouter } from './HealthRouter.js';
import { getInteractionsRouter } from './InteractionsRouter.js';

export function registerRoutes(fastifyInstance: FastifyInstance) {
  fastifyInstance.register(getHealthRouter, {
    logLevel: 'error',
    prefix: '/health',
  });

  fastifyInstance.register(getInteractionsRouter, {
    prefix: '/api/csat/v1',
  });

  fastifyInstance.register(getFeedbacksRouter, {
    prefix: '/api/csat/v1',
  });

  fastifyInstance.log.info('Fastify Routes registered');
}
