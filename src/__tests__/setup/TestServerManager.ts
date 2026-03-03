import type { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { getConfig } from '../../config.js';
import { startServer } from '../../server/index.js';

export class TestServerManager {
  public fastifyInstance: FastifyInstance | null = null;
  public request: TestAgent | null = null;
  public port: number = Math.floor(Math.random() * (13000 - 12000 + 1)) + 12000;

  async start(): Promise<void> {
    const config = getConfig();
    config.server.port = this.port;

    const server = await startServer(config);
    this.fastifyInstance = server.fastifyInstance;

    this.request = supertest(this.fastifyInstance.server);
  }

  async stop(): Promise<void> {
    try {
      if (this.fastifyInstance) {
        await this.fastifyInstance.close();
        this.fastifyInstance = null;
      }
    } catch (error) {
      console.error('Error stopping test server:', error);
      throw error;
    }
  }
}
