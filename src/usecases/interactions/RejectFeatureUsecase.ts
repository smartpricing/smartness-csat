import type { PostgresClient } from '../../clients/PostgresClient.js';
import { NotFoundError } from '../../types/errors.js';

type RejectFeatureParams = {
  productKey: string;
  featureKey: string;
  userEmail: string;
};

type RejectFeatureResponse = {
  user_email: string;
  interaction_count: number;
  total_interaction_count: number;
  interaction_threshold: number;
  rejection_count: number;
  rejection_threshold: number;
  should_request_feedback: boolean;
  created_at: string;
  updated_at: string;
};

export class RejectFeatureUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: RejectFeatureParams): Promise<RejectFeatureResponse> {
    const feature = await this._resolveFeature(params.productKey, params.featureKey);

    const result = await this._postgresClient.client.query<{
      user_email: string;
      interaction_count: number;
      total_interaction_count: number;
      rejection_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO csat.user_feature_interaction (user_email, product_feature_id, rejection_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_email, product_feature_id)
       DO UPDATE SET
         interaction_count = 0,
         rejection_count = csat.user_feature_interaction.rejection_count + 1,
         updated_at = NOW()
       RETURNING user_email, interaction_count, total_interaction_count, rejection_count, created_at, updated_at`,
      [params.userEmail, feature.id],
    );

    const row = result.rows[0]!;

    return {
      user_email: row.user_email,
      interaction_count: row.interaction_count,
      total_interaction_count: row.total_interaction_count,
      interaction_threshold: feature.interaction_threshold,
      rejection_count: row.rejection_count,
      rejection_threshold: feature.rejection_threshold,
      should_request_feedback: false, // Rejecting the prompt should not trigger a new prompt
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private async _resolveFeature(
    productKey: string,
    featureKey: string,
  ): Promise<{ id: string; interaction_threshold: number; rejection_threshold: number }> {
    const result = await this._postgresClient.client.query<{
      id: string;
      interaction_threshold: number;
      rejection_threshold: number;
    }>(
      `SELECT pf.id, pf.interaction_threshold, pf.rejection_threshold
       FROM csat.product_feature pf
       JOIN csat.product p ON p.key = pf.product_key
       WHERE pf.product_key = $1 AND pf.key = $2`,
      [productKey, featureKey],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Feature', `${productKey}/${featureKey}`);
    }

    return result.rows[0]!;
  }
}
