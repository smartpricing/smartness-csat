export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, code: string, details?: unknown) {
    super(message, code, details);
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string, code: string, details?: unknown) {
    super(message, code, details);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code: string, details?: unknown) {
    super(message, code, details);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string, details?: unknown) {
    const message = id ? `${entity} with id ${id} not found` : `${entity} not found`;
    super(message, 'NOT_FOUND', details);
  }
}

export class ConfigurationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}
