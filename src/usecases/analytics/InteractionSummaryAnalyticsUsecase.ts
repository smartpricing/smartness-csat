import type { PostgresClient } from '../../clients/PostgresClient.js';

type Params = {
  productKey: string;
  featureKey: string;
};

type Summary = {
  users_with_interactions: number;
  avg_total_interactions: number;
  max_total_interactions: number;
  users_rejection_exhausted: number;
};

export type InteractionSummaryAnalyticsResponse = {
  summary: Summary;
};

export class InteractionSummaryAnalyticsUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: Params): Promise<InteractionSummaryAnalyticsResponse> {
    const { productKey, featureKey } = params;

    const result = await this._postgresClient.client.query<{
      users_with_interactions: string;
      avg_total_interactions: string;
      max_total_interactions: string;
      users_rejection_exhausted: string;
    }>(
      `SELECT
         COUNT(*)::TEXT AS users_with_interactions,
         COALESCE(ROUND(AVG(ufi.total_interaction_count)), 0)::TEXT AS avg_total_interactions,
         COALESCE(MAX(ufi.total_interaction_count), 0)::TEXT AS max_total_interactions,
         COUNT(*) FILTER (WHERE ufi.rejection_count >= pf.rejection_threshold)::TEXT AS users_rejection_exhausted
       FROM csat.user_feature_interaction ufi
       JOIN csat.product_feature pf ON pf.id = ufi.product_feature_id
       WHERE pf.product_key = $1 AND pf.key = $2`,
      [productKey, featureKey],
    );

    const row = result.rows[0];

    return {
      summary: {
        users_with_interactions: Number.parseInt(row?.users_with_interactions ?? '0', 10),
        avg_total_interactions: Number.parseInt(row?.avg_total_interactions ?? '0', 10),
        max_total_interactions: Number.parseInt(row?.max_total_interactions ?? '0', 10),
        users_rejection_exhausted: Number.parseInt(row?.users_rejection_exhausted ?? '0', 10),
      },
    };
  }
}
