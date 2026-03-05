import type { PostgresClient } from '../../clients/PostgresClient.js';
import { ConflictError, NotFoundError } from '../../types/errors.js';

type CreateFeatureParams = {
  productKey: string;
  featureKey: string;
  description?: string;
  interactionThreshold: number;
  rejectionThreshold: number;
};

type CreateFeatureResponse = {
  product_key: string;
  feature_key: string;
  name: string;
  description: string | null;
  interaction_threshold: number;
  rejection_threshold: number;
};

export class CreateFeatureUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: CreateFeatureParams): Promise<CreateFeatureResponse> {
    const { productKey, featureKey, description, interactionThreshold, rejectionThreshold } = params;

    const productResult = await this._postgresClient.client.query<{ key: string }>(
      `SELECT key FROM csat.product WHERE key = $1`,
      [productKey],
    );

    if (productResult.rowCount === 0) {
      throw new NotFoundError('Product', productKey);
    }

    const name = featureKey.replace(/[-_.+]/g, ' ');

    try {
      const result = await this._postgresClient.client.query<{
        product_key: string;
        feature_key: string;
        name: string;
        description: string | null;
        interaction_threshold: number;
        rejection_threshold: number;
      }>(
        `INSERT INTO csat.product_feature (product_key, key, name, description, interaction_threshold, rejection_threshold)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING product_key, key AS feature_key, name, description, interaction_threshold, rejection_threshold`,
        [productKey, featureKey, name, description ?? null, interactionThreshold, rejectionThreshold],
      );

      const row = result.rows[0];
      if (!row) throw new Error('INSERT returned no row');
      return row;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new ConflictError(
          `Feature '${featureKey}' already exists for product '${productKey}'`,
          'FEATURE_ALREADY_EXISTS',
        );
      }
      throw error;
    }
  }
}
