import { subDays } from 'date-fns';
import type { PostgresClient } from '../../clients/PostgresClient.js';
import { NotFoundError } from '../../types/errors.js';

type GetUserInteractionsParams = {
  productKey: string;
  userEmail: string;
};

type FeatureInteraction = {
  product_feature_key: string;
  product_feature_description: string | null;
  interaction_count: number;
  total_interaction_count: number;
  interaction_threshold: number;
  rejection_count: number;
  rejection_threshold: number;
  should_request_feedback: boolean;
};

type GetUserInteractionsResponse = {
  data: FeatureInteraction[];
};

export class GetUserInteractionsUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: GetUserInteractionsParams): Promise<GetUserInteractionsResponse> {
    await this._validateProduct(params.productKey);

    const result = await this._postgresClient.client.query<{
      key: string;
      description: string | null;
      interaction_threshold: number;
      rejection_threshold: number;
      interaction_count: number | null;
      total_interaction_count: number | null;
      rejection_count: number | null;
      last_feedback_at: Date | null;
    }>(
      `SELECT
         pf.key,
         pf.description,
         pf.interaction_threshold,
         pf.rejection_threshold,
         ufi.interaction_count,
         ufi.total_interaction_count,
         ufi.rejection_count,
         (SELECT MAX(uf.created_at)
          FROM csat.user_feedback uf
          WHERE uf.user_email = $2 AND uf.product_feature_id = pf.id) AS last_feedback_at
       FROM csat.product_feature pf
       JOIN csat.product p ON p.key = pf.product_key
       LEFT JOIN csat.user_feature_interaction ufi
         ON ufi.product_feature_id = pf.id AND ufi.user_email = $2
       WHERE pf.product_key = $1
       ORDER BY pf.key`,
      [params.productKey, params.userEmail],
    );

    const sixMonthsAgo = subDays(new Date(), 180);

    const data: FeatureInteraction[] = result.rows.map((row) => {
      const interactionCount = row.interaction_count ?? 0;
      const totalInteractionCount = row.total_interaction_count ?? 0;
      const rejectionCount = row.rejection_count ?? 0;

      const hasRecentFeedback = row.last_feedback_at && row.last_feedback_at > sixMonthsAgo;
      const meetsThreshold = interactionCount >= row.interaction_threshold;
      const belowRejectionLimit = rejectionCount < row.rejection_threshold;

      return {
        product_feature_key: row.key,
        product_feature_description: row.description,
        interaction_count: interactionCount,
        total_interaction_count: totalInteractionCount,
        interaction_threshold: row.interaction_threshold,
        rejection_count: rejectionCount,
        rejection_threshold: row.rejection_threshold,
        should_request_feedback: meetsThreshold && belowRejectionLimit && !hasRecentFeedback,
      };
    });

    return { data };
  }

  private async _validateProduct(productKey: string): Promise<void> {
    const result = await this._postgresClient.client.query(
      `SELECT 1 FROM csat.product WHERE key = $1`,
      [productKey],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Product', productKey);
    }
  }
}
