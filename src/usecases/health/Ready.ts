import type { PostgresClient } from '../../clients/PostgresClient.js';

export class HealthReadyUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(): Promise<void> {
    await this._postgresClient.client.query('SELECT 1');
  }
}
