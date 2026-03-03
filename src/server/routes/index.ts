import type { FastifyInstance } from 'fastify';

import { getAnalyticsRouter } from './AnalyticsRouter.js';
import { getFeaturesRouter } from './FeaturesRouter.js';
import { getFeedbacksRouter } from './FeedbacksRouter.js';
import { getHealthRouter } from './HealthRouter.js';
import { getInteractionsRouter } from './InteractionsRouter.js';
import { getProductsRouter } from './ProductsRouter.js';

export function registerRoutes(fastifyInstance: FastifyInstance) {
  fastifyInstance.register(getHealthRouter, {
    logLevel: 'error',
    prefix: '/health',
  });

  fastifyInstance.register(getInteractionsRouter, {
    prefix: '/api/csat/v1',
  });

  fastifyInstance.register(getFeaturesRouter, {
    prefix: '/api/csat/v1',
  });

  fastifyInstance.register(getProductsRouter, {
    prefix: '/api/csat/v1',
  });

  fastifyInstance.register(getFeedbacksRouter, {
    prefix: '/api/csat/v1',
  });

  fastifyInstance.register(getAnalyticsRouter, {
    prefix: '/api/csat/v1/analytics',
  });

  fastifyInstance.log.info('Fastify Routes registered');
}
