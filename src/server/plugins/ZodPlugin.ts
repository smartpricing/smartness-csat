import type { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

export function registerZodPlugin(fastifyInstance: FastifyInstance) {
  fastifyInstance.setValidatorCompiler(validatorCompiler);
  fastifyInstance.setSerializerCompiler(serializerCompiler);

  fastifyInstance.log.info('Fastify Zod Plugin registered');
}
