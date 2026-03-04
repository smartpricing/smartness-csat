import type { PostgresClient } from '../../clients/PostgresClient.js';

type ProductEntity = {
  key: string;
  name: string;
};

type GetProductsResponse = {
  data: ProductEntity[];
};

export class GetProductsUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(): Promise<GetProductsResponse> {
    const result = await this._postgresClient.client.query<ProductEntity>(
      `SELECT key, name FROM csat.product ORDER BY name`,
    );

    return {
      data: result.rows.map((row) => ({
        key: row.key,
        name: row.name,
      })),
    };
  }
}
