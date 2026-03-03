import { Pool } from 'pg';
import { getConfig } from '../config.js';
import { logger } from '../utils/logger.js';

export class PostgresClient {
  private static _instance: PostgresClient | null = null;

  static getInstance(): PostgresClient {
    if (!PostgresClient._instance) {
      PostgresClient._instance = new PostgresClient();
    }

    return PostgresClient._instance;
  }

  client: Pool;

  constructor() {
    const { pg } = getConfig();

    this.client = new Pool({
      host: pg.host,
      user: pg.user,
      password: pg.password,
      database: pg.database,
      port: pg.port,
      ssl: pg.ssl ? { rejectUnauthorized: false } : undefined,
      max: 20,
    });

    logger.info({
      msg: '🐘 Postgres client initialized',
      config: { host: pg.host, port: pg.port, database: pg.database, ssl: pg.ssl },
    });
  }
}
