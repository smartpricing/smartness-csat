import type { PostgresClient } from '../../clients/PostgresClient.js';
import { NotFoundError } from '../../types/errors.js';
import { logger } from '../../utils/logger.js';

type SaveFeedbackParams = {
  productKey: string;
  featureKey: string;
  userEmail: string;
  rating: number;
  comment?: string | undefined;
  source: 'prompted' | 'voluntary';
  userAgent?: string | undefined;
};

type SaveFeedbackResponse = {
  user_email: string;
  rating: number;
  comment: string | null;
  source: string;
  user_agent: string | null;
  created_at: string;
};

export class SaveFeedbackUsecase {
  constructor(private readonly _postgresClient: PostgresClient) {}

  async execute(params: SaveFeedbackParams): Promise<SaveFeedbackResponse> {
    const featureId = await this._resolveFeatureId(params.productKey, params.featureKey);

    logger.info(
      `For user ${params.userEmail}, product ${params.productKey}, feature ${params.featureKey}, inserting feedback with rating ${params.rating} and comment ${params.comment}`,
    );

    const result = await this._postgresClient.client.query<{
      user_email: string;
      rating: number;
      comment: string | null;
      source: string;
      user_agent: string | null;
      created_at: Date;
    }>(
      `INSERT INTO csat.user_feedback (user_email, product_feature_id, rating, comment, source, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_email, rating, comment, source, user_agent, created_at`,
      [params.userEmail, featureId, params.rating, params.comment ?? null, params.source, params.userAgent ?? null],
    );

    await this._resetInteractionCounters(params.userEmail, featureId);

    const row = result.rows[0]!;

    return {
      user_email: row.user_email,
      rating: row.rating,
      comment: row.comment,
      source: row.source,
      user_agent: row.user_agent,
      created_at: row.created_at.toISOString(),
    };
  }

  private async _resetInteractionCounters(userEmail: string, featureId: string): Promise<void> {
    await this._postgresClient.client.query(
      `UPDATE csat.user_feature_interaction
       SET interaction_count = 0, rejection_count = 0, updated_at = NOW()
       WHERE user_email = $1 AND product_feature_id = $2`,
      [userEmail, featureId],
    );
  }

  private async _resolveFeatureId(productKey: string, featureKey: string): Promise<string> {
    const result = await this._postgresClient.client.query<{ id: string }>(
      `SELECT pf.id
       FROM csat.product_feature pf
       JOIN csat.product p ON p.key = pf.product_key
       WHERE pf.product_key = $1 AND pf.key = $2`,
      [productKey, featureKey],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Feature', `${productKey}/${featureKey}`);
    }

    return result.rows[0]!.id;
  }
}
