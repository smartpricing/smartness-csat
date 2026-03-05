import type { PostgresClient } from '../../clients/PostgresClient.js';
import { NotFoundError } from '../../types/errors.js';

type UpdateFeatureParams = {
  productKey: string;
  featureKey: string;
  name?: string | null;
  description?: string | null;
};

type UpdateFeatureResponse = {
  product_key: string;
  feature_key: string;
  name: string | null;
  description: string | null;
  interaction_threshold: number;
  rejection_threshold: number;
};

export class UpdateFeatureUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: UpdateFeatureParams): Promise<UpdateFeatureResponse> {
    const { productKey, featureKey, name, description } = params;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      values.push(name);
    }

    if (description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      values.push(description);
    }

    values.push(productKey, featureKey);

    const result = await this._postgresClient.client.query<{
      product_key: string;
      feature_key: string;
      name: string | null;
      description: string | null;
      interaction_threshold: number;
      rejection_threshold: number;
    }>(
      `UPDATE csat.product_feature
       SET ${setClauses.join(', ')}
       WHERE product_key = $${idx++} AND key = $${idx++}
       RETURNING product_key, key AS feature_key, name, description, interaction_threshold, rejection_threshold`,
      values,
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Feature', `${productKey}/${featureKey}`);
    }

    const row = result.rows[0];
    if (!row) throw new Error('UPDATE returned no row');
    return row;
  }
}
