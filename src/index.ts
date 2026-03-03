process.env['TZ'] = 'UTC';

import { getConfig } from './config.js';
import { startServer } from './server/index.js';
import './telemetry.js';

try {
  const config = getConfig();

  await startServer(config);
} catch (e) {
  console.log(new Date(), '#> application error', e);
  process.exit(0);
}

process.on('uncaughtException', (e) => {
  console.log(new Date(), '#> uncaughtException', e);
});
