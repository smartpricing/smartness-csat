import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  BusinessRuleError,
  ConfigurationError,
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '../types/errors.js';

export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  const traceId = crypto.randomUUID();

  request.log.error(error, `Error processing request: ${error.message}`);

  if (error instanceof DomainError) {
    const { statusCode, httpError } = mapDomainErrorToHttp(error);

    return reply.status(statusCode).send({
      message: error.message,
      statusCode: statusCode,
      type: httpError,
      code: error.code,
      details: error.details,
      data: { endpoint: request.url },
      subcode: null,
      traceId: traceId,
    });
  }

  const statusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;

  return reply.status(statusCode).send({
    message: error.message || 'An unexpected error occurred',
    statusCode: statusCode,
    type: 'INTERNAL_ERROR',
    data: {
      endpoint: request.url,
      details: 'The server encountered an unexpected condition that prevented it from fulfilling the request',
    },
    subcode: null,
    traceId: traceId,
  });
}

function mapDomainErrorToHttp(error: DomainError): { statusCode: number; httpError: string } {
  if (error instanceof ValidationError) {
    return { statusCode: 400, httpError: 'VALIDATION_ERROR' };
  }

  if (error instanceof BusinessRuleError) {
    return { statusCode: 400, httpError: 'BUSINESS_RULE_ERROR' };
  }

  if (error instanceof NotFoundError) {
    return { statusCode: 404, httpError: 'NOT_FOUND' };
  }

  if (error instanceof ConflictError) {
    return { statusCode: 409, httpError: 'CONFLICT' };
  }

  if (error instanceof ConfigurationError) {
    return { statusCode: 500, httpError: 'CONFIGURATION_ERROR' };
  }

  return { statusCode: 500, httpError: 'INTERNAL_ERROR' };
}
