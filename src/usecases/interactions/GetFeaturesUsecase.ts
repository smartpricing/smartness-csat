import type { PostgresClient } from '../../clients/PostgresClient.js';

type GetFeaturesParams = {
  productKeys?: string[] | undefined;
};

type FeatureEntity = {
  product_key: string;
  feature_key: string;
  description: string | null;
  interaction_threshold: number;
  rejection_threshold: number;
};

type GetFeaturesResponse = {
  data: FeatureEntity[];
};

export class GetFeaturesUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: GetFeaturesParams): Promise<GetFeaturesResponse> {
    const hasFilter = params.productKeys && params.productKeys.length > 0;

    const query = hasFilter
      ? `SELECT pf.product_key, pf.key AS feature_key, pf.description,
                pf.interaction_threshold, pf.rejection_threshold
         FROM csat.product_feature pf
         JOIN csat.product p ON p.key = pf.product_key
         WHERE pf.product_key = ANY($1)
         ORDER BY pf.product_key, pf.key`
      : `SELECT pf.product_key, pf.key AS feature_key, pf.description,
                pf.interaction_threshold, pf.rejection_threshold
         FROM csat.product_feature pf
         JOIN csat.product p ON p.key = pf.product_key
         ORDER BY pf.product_key, pf.key`;

    const queryParams = hasFilter ? [params.productKeys] : [];

    const result = await this._postgresClient.client.query<{
      product_key: string;
      feature_key: string;
      description: string | null;
      interaction_threshold: number;
      rejection_threshold: number;
    }>(query, queryParams);

    return {
      data: result.rows.map((row) => ({
        product_key: row.product_key,
        feature_key: row.feature_key,
        description: row.description,
        interaction_threshold: row.interaction_threshold,
        rejection_threshold: row.rejection_threshold,
      })),
    };
  }
}
