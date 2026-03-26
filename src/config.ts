import packagejson from '../package.json' with { type: 'json' };

export type Config = ReturnType<typeof getConfig>;

export function getConfig() {
  const {
    // Server
    HOST,
    PORT,

    // Postgres
    PG_HOST,
    PG_PORT,
    PG_USER,
    PG_PASSWORD,
    PG_DATABASE,
    PG_SSL,
    PG_USE_SSL,

    // OpenTelemetry
    OTEL_SERVICE_NAME = '',
    OTEL_SDK_DISABLED = '',
    OTEL_EXPORTER_OTLP_ENDPOINT = '',

    // Logging
    LOG_LEVEL = '',

    // API Gateway
    API_GATEWAY_URL = '',
    API_GATEWAY_AUTH = '',

    // Zapier
    ZAPIER_WEBHOOK_URL = '',
  } = process.env;

  return {
    version: packagejson.version,

    server: {
      host: HOST ?? '0.0.0.0',
      port: PORT ? Number(PORT) : 3018,
    },

    pg: {
      host: PG_HOST ?? '',
      port: Number(PG_PORT ?? ''),
      user: PG_USER ?? '',
      password: PG_PASSWORD ?? '',
      database: PG_DATABASE ?? '',
      ssl: (PG_SSL ?? PG_USE_SSL) === 'true',
    },

    otel: {
      serviceName: OTEL_SERVICE_NAME ?? '',
      otlpExportEndpoint: OTEL_EXPORTER_OTLP_ENDPOINT,
      disabled: OTEL_SDK_DISABLED === 'true' ? true : false,
    },

    log: {
      level: LOG_LEVEL,
    },

    apiGateway: {
      baseUrl: API_GATEWAY_URL,
      token: API_GATEWAY_AUTH,
    },

    zapier: {
      webhookUrl: ZAPIER_WEBHOOK_URL,
    },
  };
}
