import type { FastifyInstance } from 'fastify';
import { registerFastifySwagger } from './FastifySwagger.js';
import { registerFastifySwaggerUI } from './FastifySwaggerUI.js';
import { registerScalarApiDoc } from './ScalarApiDoc.js';
import { registerZodPlugin } from './ZodPlugin.js';

export function registerPlugins(fastifyInstance: FastifyInstance) {
  registerZodPlugin(fastifyInstance);
  registerFastifySwagger(fastifyInstance);
  registerFastifySwaggerUI(fastifyInstance);
  registerScalarApiDoc(fastifyInstance);

  fastifyInstance.log.info('Fastify Plugins registered');
}
