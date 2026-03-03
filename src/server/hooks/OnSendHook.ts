import type { FastifyInstance } from 'fastify';

const HEADERS = Object.freeze({
  REQUEST_ID: 'request-id',
  TRACE_ID: 'traceid',
});

export function registerOnSendHook(app: FastifyInstance) {
  app.addHook('onSend', async (request, reply) => {
    reply.header(HEADERS.REQUEST_ID, request.id);

    const { inject, span } = request.opentelemetry?.() ?? {};

    if (inject && span) {
      reply.header(HEADERS.TRACE_ID, span?.spanContext().traceId);

      const carrier = {};
      inject?.(carrier);

      reply.headers(carrier);
    }
  });

  app.log.debug('Fastify hook registered: onSend');
}
