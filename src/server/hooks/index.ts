import type { FastifyInstance } from 'fastify';
import { registerOnCloseHook } from './OnCloseHook.js';
import { registerOnSendHook } from './OnSendHook.js';
import { registerRequestIdHook } from './RequestIdHook.js';
import { registerVersionHeaderHook } from './VersionHeaderHook.js';

export function registerHooks(fastifyInstance: FastifyInstance) {
  registerOnCloseHook(fastifyInstance);
  registerRequestIdHook(fastifyInstance);
  registerVersionHeaderHook(fastifyInstance);
  registerOnSendHook(fastifyInstance);

  fastifyInstance.log.info('Fastify Hooks registered');
}
