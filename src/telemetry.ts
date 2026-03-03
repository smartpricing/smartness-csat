import { FastifyOtelInstrumentation } from '@fastify/otel';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import type { HTTPMethods } from 'fastify';
import type { IncomingMessage } from 'http';

import { getConfig } from './config.js';

const { version, otel: { disabled: telemetryDisabled, otlpExportEndpoint } = {} } = getConfig();

if (!telemetryDisabled && otlpExportEndpoint) {
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          concurrencyLimit: 1,
        }),
      }),
    ],
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req: IncomingMessage) => shouldIgnoreRequest({ url: req.url, method: req.method }),
      }),
      new PgInstrumentation(),
      new PinoInstrumentation({ disableLogSending: true }),
      new RuntimeNodeInstrumentation(),
      new FastifyOtelInstrumentation({
        registerOnInitialization: true,
        ignorePaths: shouldIgnoreRequest,
        requestHook: (span, request) => {
          span.setAttribute('request.id', request.id);
          span.updateName(`${request.method} ${request.routeOptions.url}`);
        },
      }),
    ],
  });

  sdk.start();

  console.log(
    JSON.stringify({
      level: 'info',
      version,
      time: new Date().getTime(),
      telemetryDisabled,
      endpoint: otlpExportEndpoint,
      msg: 'started exporting telemetry with OTLP',
    }),
  );
} else {
  console.log(
    JSON.stringify({
      level: 'info',
      version,
      time: new Date().getTime(),
      telemetryDisabled,
      endpoint: otlpExportEndpoint,
      msg: `telemetry uninitialized`,
    }),
  );
}

function shouldIgnoreRequest({ url, method }: { url: string | undefined; method: string | HTTPMethods | undefined }) {
  if (method === 'OPTIONS') {
    return true;
  }

  if (url?.startsWith('/health') || url?.startsWith('/documentation')) {
    return true;
  }

  return false;
}
